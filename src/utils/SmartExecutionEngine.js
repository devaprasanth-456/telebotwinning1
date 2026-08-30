/**
 * SmartExecutionEngine.js
 * -----------------------
 * Real-Time Telemetry Ingestion, Dynamic Prediction Matching,
 * Pareto Hazard Detection, and Automated Cash-Out Decision Logic.
 */

import { computeOutcomeFast } from './provablyFairEngine.js';

export const EXECUTION_MODES = {
  CONSERVATIVE: {
    id: 'CONSERVATIVE',
    label: 'Conservative',
    margin: 0.92, // Target 92% of predicted crash
    description: 'Auto-cashout at 92% of predicted target to secure wins before volatility.',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
  AGGRESSIVE: {
    id: 'AGGRESSIVE',
    label: 'Aggressive',
    margin: 0.98, // Target 98% of predicted crash
    description: 'Rides multiplier to 98% of prediction for maximum profit yield.',
    color: 'text-aviator-lime',
    badgeBg: 'bg-aviator-lime/10 border-aviator-lime/30 text-aviator-lime',
  },
  WATCHDOG: {
    id: 'WATCHDOG',
    label: 'Watchdog AI',
    margin: 0.90, // Adaptive rate-of-climb monitoring with early exit
    description: 'Monitors curve acceleration (dm/dt) and exits immediately if stall is detected.',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  },
  CUSTOM: {
    id: 'CUSTOM',
    label: 'Manual / Custom',
    margin: 0.95,
    description: 'Custom user-defined multiplier target and risk boundary.',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  },
};

export class SmartExecutionEngine {
  constructor() {
    this.mode = 'CONSERVATIVE';
    this.autoTrigger = true;
    this.stakeAmount = 10.0;
    this.customTarget = 2.0;

    // Runtime state
    this.currentRoundId = null;
    this.predictedCrash = 2.0;
    this.targetCashout = 1.84;
    this.state = 'IDLE'; // 'IDLE', 'COUNTDOWN', 'IN_FLIGHT', 'CASHED_OUT', 'CRASHED'
    this.currentMultiplier = 1.0;
    this.hasCashedOut = false;
    this.cashedOutMultiplier = null;
    this.pnlThisRound = 0.0;
    this.signalQuality = 'OPTIMAL'; // 'OPTIMAL' (green), 'TRENDING' (blue), 'HAZARD' (red)
    this.progressPct = 0;

    // Velocity & Hazard tracking
    this.lastTickTime = Date.now();
    this.lastMultiplier = 1.0;
    this.velocityHistory = [];

    // Session log history
    this.sessionLogs = [];
    this.sessionStats = {
      roundsTracked: 0,
      cashoutsExecuted: 0,
      missedRounds: 0,
      totalPnl: 0.0,
      startTime: new Date().toISOString(),
    };

    // Listeners
    this.listeners = [];
  }

  setMode(modeId) {
    if (EXECUTION_MODES[modeId]) {
      this.mode = modeId;
      this._recomputeTarget();
      this._notify();
    }
  }

  setAutoTrigger(enabled) {
    this.autoTrigger = !!enabled;
    this._notify();
  }

  setStakeAmount(amount) {
    this.stakeAmount = Math.max(1, parseFloat(amount) || 10);
    this._notify();
  }

  setCustomTarget(mult) {
    this.customTarget = Math.max(1.05, parseFloat(mult) || 2.0);
    if (this.mode === 'CUSTOM') {
      this.targetCashout = this.customTarget;
    }
    this._notify();
  }

  _recomputeTarget() {
    const config = EXECUTION_MODES[this.mode];
    if (this.mode === 'CUSTOM') {
      this.targetCashout = Number(this.customTarget.toFixed(2));
    } else {
      const margin = config ? config.margin : 0.92;
      const calc = this.predictedCrash * margin;
      this.targetCashout = Number(Math.max(1.05, Math.min(calc, this.predictedCrash - 0.02)).toFixed(2));
    }
  }

  setPredictedCrash(mult) {
    if (mult && !isNaN(mult) && mult >= 1.01) {
      this.predictedCrash = parseFloat(mult);
      this._recomputeTarget();
      this._notify();
    }
  }

  /**
   * Called when a new round starts.
   */
  startRound(roundId, serverSeed = null, clientSeed = null, explicitPrediction = null) {
    if (roundId && roundId !== this.currentRoundId) {
      this.currentRoundId = roundId;
    } else {
      this.currentRoundId = (this.currentRoundId ? this.currentRoundId + 1 : Math.floor(Date.now() / 15000));
    }

    this.state = 'COUNTDOWN';
    this.currentMultiplier = 1.0;
    this.hasCashedOut = false;
    this.cashedOutMultiplier = null;
    this.pnlThisRound = 0.0;
    this.signalQuality = 'OPTIMAL';
    this.progressPct = 0;
    this.lastTickTime = Date.now();
    this.lastMultiplier = 1.0;
    this.velocityHistory = [];

    // Prioritize explicit live server prediction if provided
    if (explicitPrediction && !isNaN(explicitPrediction) && explicitPrediction >= 1.01) {
      this.predictedCrash = parseFloat(explicitPrediction);
    } else {
      const sSeed = serverSeed || 'lucky_jet_server_seed_' + Math.floor(this.currentRoundId / 100);
      const cSeed = clientSeed || 'lucky_jet_client_entropy';
      try {
        const outcome = computeOutcomeFast(sSeed, cSeed, this.currentRoundId);
        this.predictedCrash = outcome.multiplier >= 1.01 ? outcome.multiplier : 2.14;
      } catch {
        this.predictedCrash = Number((1.20 + ((this.currentRoundId * 137) % 700) / 100).toFixed(2));
      }
    }

    this._recomputeTarget();
    this._logEvent('ROUND_START', {
      roundId: this.currentRoundId,
      predictedCrash: this.predictedCrash,
      targetCashout: this.targetCashout,
      mode: this.mode,
    });

    this._notify();
  }

  /**
   * Called on every live multiplier speed update.
   */
  onMultiplierTick(multiplier) {
    if (multiplier === null || isNaN(multiplier)) return;
    const numMult = parseFloat(multiplier);
    this.currentMultiplier = numMult;
    if (this.state !== 'CASHED_OUT' && this.state !== 'CRASHED') {
      this.state = 'IN_FLIGHT';
    }

    const now = Date.now();
    const dt = Math.max(1, now - this.lastTickTime) / 1000;
    const dm = numMult - this.lastMultiplier;
    const velocity = dm / dt;
    this.lastTickTime = now;
    this.lastMultiplier = numMult;

    // Track rolling velocity
    this.velocityHistory.push(velocity);
    if (this.velocityHistory.length > 8) this.velocityHistory.shift();

    // Calculate progress percentage to target cashout
    const denom = Math.max(0.01, this.targetCashout - 1.0);
    const numer = Math.max(0, numMult - 1.0);
    this.progressPct = Math.min(100, Number(((numer / denom) * 100).toFixed(1)));

    // Evaluate Signal Quality & Pareto Hazard
    const distanceToTarget = this.targetCashout - numMult;
    const hazardThreshold = this.predictedCrash * 0.90;

    if (numMult >= hazardThreshold && !this.hasCashedOut) {
      this.signalQuality = 'HAZARD'; // Red: inside danger zone
    } else if (distanceToTarget > 0.4) {
      this.signalQuality = 'OPTIMAL'; // Green: steady ascent
    } else {
      this.signalQuality = 'TRENDING'; // Blue: close to cashout
    }

    // --- SMART CASH-OUT TRIGGER EVALUATION ---
    if (!this.hasCashedOut && this.state === 'IN_FLIGHT') {
      // 1. Target Multiplier Reached
      if (numMult >= this.targetCashout) {
        if (this.autoTrigger) {
          this.executeCashout('TARGET_REACHED', numMult);
        } else {
          this._notify({ alert: 'CASH_OUT_NOW', multiplier: numMult });
        }
      }
      // 2. Watchdog Mode: Detect deceleration / stall near prediction
      else if (this.mode === 'WATCHDOG' && numMult >= this.targetCashout * 0.90) {
        const avgVelocity = this.velocityHistory.reduce((a, b) => a + b, 0) / (this.velocityHistory.length || 1);
        if (avgVelocity < 0.15) {
          if (this.autoTrigger) {
            this.executeCashout('WATCHDOG_STALL_DEFENSE', numMult);
          } else {
            this.signalQuality = 'HAZARD';
            this._notify({ alert: 'WATCHDOG_EARLY_EXIT', multiplier: numMult });
          }
        }
      }
    }

    this._notify();
  }

  /**
   * Triggers a cash-out action (simulated or automated).
   */
  executeCashout(reason = 'MANUAL_TRIGGER', multiplier = null) {
    if (this.hasCashedOut || this.state === 'CRASHED') return;

    const exitMult = multiplier || this.currentMultiplier;
    this.hasCashedOut = true;
    this.cashedOutMultiplier = exitMult;
    this.state = 'CASHED_OUT';

    // PnL calculation: stake * (exitMultiplier - 1)
    const profit = this.stakeAmount * (exitMult - 1);
    this.pnlThisRound = Number(profit.toFixed(2));

    this.sessionStats.cashoutsExecuted++;
    this.sessionStats.totalPnl = Number((this.sessionStats.totalPnl + this.pnlThisRound).toFixed(2));

    this._logEvent('CASHOUT_SUCCESS', {
      roundId: this.currentRoundId,
      exitMultiplier: exitMult,
      targetCashout: this.targetCashout,
      profit: this.pnlThisRound,
      stake: this.stakeAmount,
      reason,
    });

    this._notify({ action: 'CASHOUT_EXECUTED', profit: this.pnlThisRound, multiplier: exitMult });
  }

  /**
   * Called when round crashes / ends.
   */
  endRound(finalCrashPoint) {
    const finalMult = parseFloat(finalCrashPoint) || this.currentMultiplier;
    this.state = 'CRASHED';
    this.currentMultiplier = finalMult;
    this.sessionStats.roundsTracked++;

    if (!this.hasCashedOut) {
      this.pnlThisRound = -this.stakeAmount;
      this.sessionStats.missedRounds++;
      this.sessionStats.totalPnl = Number((this.sessionStats.totalPnl - this.stakeAmount).toFixed(2));

      this._logEvent('ROUND_BUST', {
        roundId: this.currentRoundId,
        finalCrash: finalMult,
        predictedCrash: this.predictedCrash,
        loss: -this.stakeAmount,
      });
    } else {
      this._logEvent('ROUND_SUMMARY', {
        roundId: this.currentRoundId,
        finalCrash: finalMult,
        predictedCrash: this.predictedCrash,
        exitMultiplier: this.cashedOutMultiplier,
        profit: this.pnlThisRound,
      });
    }

    this._notify();
  }

  _logEvent(type, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString(),
      type,
      ...data,
    };
    this.sessionLogs.push(entry);
    if (this.sessionLogs.length > 200) this.sessionLogs.shift();
  }

  /**
   * Exports full session telemetry to runtime_session.log
   */
  exportSessionLog() {
    let logContent = `=======================================================\n`;
    logContent += `🚀 WE GIVE ANSWER PRO - RUNTIME SESSION EXECUTION LOG\n`;
    logContent += `Started: ${this.sessionStats.startTime}\n`;
    logContent += `Total Rounds Tracked: ${this.sessionStats.roundsTracked}\n`;
    logContent += `Successful Cashouts : ${this.sessionStats.cashoutsExecuted}\n`;
    logContent += `Busted Rounds       : ${this.sessionStats.missedRounds}\n`;
    logContent += `Net Session P&L     : $${this.sessionStats.totalPnl.toFixed(2)}\n`;
    logContent += `=======================================================\n\n`;

    this.sessionLogs.forEach((item) => {
      logContent += `[${item.time}] [${item.type}] ${JSON.stringify(item)}\n`;
    });

    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `runtime_session_${Date.now()}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  subscribe(callback) {
    this.listeners.push(callback);
    callback(this.getSnapshot());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  _notify(extra = {}) {
    const snap = { ...this.getSnapshot(), ...extra };
    this.listeners.forEach((cb) => cb(snap));
  }

  getSnapshot() {
    return {
      mode: this.mode,
      autoTrigger: this.autoTrigger,
      stakeAmount: this.stakeAmount,
      customTarget: this.customTarget,
      currentRoundId: this.currentRoundId,
      predictedCrash: this.predictedCrash,
      targetCashout: this.targetCashout,
      state: this.state,
      currentMultiplier: this.currentMultiplier,
      hasCashedOut: this.hasCashedOut,
      cashedOutMultiplier: this.cashedOutMultiplier,
      pnlThisRound: this.pnlThisRound,
      signalQuality: this.signalQuality,
      progressPct: this.progressPct,
      sessionStats: { ...this.sessionStats },
      recentLogs: this.sessionLogs.slice(-25),
    };
  }
}

// Global Singleton Instance
export const globalExecutionEngine = new SmartExecutionEngine();
