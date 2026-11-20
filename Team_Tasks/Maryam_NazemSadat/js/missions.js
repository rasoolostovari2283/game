// Missions, Career Achievements, and Player Statistics System

const MISSIONS_LIST = [
  {
    id: 'near_miss_5',
    title: 'لایی‌کشی برق‌آسا',
    desc: 'ثبت ۵ لایی‌کشی موفق در یک راند',
    reward: 300,
    target: 5,
    type: 'single_run',
    progress: (stats) => stats.sessionNearMisses,
    completed: false
  },
  {
    id: 'speed_200',
    title: 'دیوانگی سرعت',
    desc: 'رسیدن به سرعت ۲۰۰ کیلومتر بر ساعت',
    reward: 400,
    target: 200,
    type: 'single_run',
    progress: (stats) => stats.maxSpeed,
    completed: false
  },
  {
    id: 'oncoming_10s',
    title: 'خلاف جهت مرگبار',
    desc: '۱۰ ثانیه رانندگی در لاین مخالف (حالت دو‌طرفه)',
    reward: 500,
    target: 10,
    type: 'single_run',
    progress: (stats) => Math.floor(stats.oncomingTime),
    completed: false
  },
  {
    id: 'coins_40',
    title: 'کیسه پر از طلا',
    desc: 'جمع‌آوری ۴۰ سکه در یک راند',
    reward: 350,
    target: 40,
    type: 'single_run',
    progress: (stats) => stats.sessionCoins,
    completed: false
  },
  {
    id: 'total_dist_5k',
    title: 'سفر در اتوبان',
    desc: 'طی کردن مسافت ۵ کیلومتر به صورت تجمعی',
    reward: 600,
    target: 5000,
    type: 'lifetime',
    progress: (stats) => Math.floor(stats.lifetimeDist),
    completed: false
  },
  {
    id: 'nitro_master',
    title: 'آتش‌افروز اتوبان',
    desc: 'استفاده از نیترو به مدت ۲۰ ثانیه در مجموع',
    reward: 450,
    target: 20,
    type: 'lifetime',
    progress: (stats) => Math.floor(stats.nitroTimeUsed),
    completed: false
  },
  {
    id: 'cyber_hack_3',
    title: 'هکر سایبری اتوبان',
    desc: '۳ بار هک موفق خودروهای ترافیک یا پلیس در یک راند',
    reward: 550,
    target: 3,
    type: 'single_run',
    progress: (stats) => stats.sessionHacks || 0,
    completed: false
  },
  {
    id: 'slowmo_dodge',
    title: 'واکنش ماتریسی',
    desc: 'استفاده از اسلوموشن به مدت ۶ ثانیه در یک مسابقه',
    reward: 400,
    target: 6,
    type: 'single_run',
    progress: (stats) => Math.floor(stats.slowmoTime || 0),
    completed: false
  }
];

class MissionManager {
  constructor() {
    this.missions = MISSIONS_LIST.map(m => Object.assign({}, m));
    this.lifetimeStats = {
      totalRaces: 0,
      lifetimeDist: 0,
      lifetimeCoins: 0,
      lifetimeNearMisses: 0,
      highestSpeed: 0,
      nitroTimeUsed: 0
    };
    this.completedMissions = [];
    this.loadData();
  }

  loadData() {
    try {
      const saved = localStorage.getItem('neon_highway_missions_v1');
      if (saved) {
        const data = JSON.parse(saved);
        this.lifetimeStats = Object.assign(this.lifetimeStats, data.lifetimeStats || {});
        this.completedMissions = data.completedMissions || [];
        this.missions.forEach(m => {
          if (this.completedMissions.includes(m.id)) {
            m.completed = true;
          }
        });
      }
    } catch (e) {
      console.warn('Missions load error', e);
    }
  }

  saveData() {
    try {
      const data = {
        lifetimeStats: this.lifetimeStats,
        completedMissions: this.completedMissions
      };
      localStorage.setItem('neon_highway_missions_v1', JSON.stringify(data));
    } catch (e) {
      console.warn('Missions save error', e);
    }
  }

  checkMissions(currentRunStats) {
    const combinedStats = {
      sessionNearMisses: currentRunStats.nearMisses || 0,
      maxSpeed: currentRunStats.maxSpeed || 0,
      oncomingTime: currentRunStats.oncomingTime || 0,
      sessionCoins: currentRunStats.sessionCoins || 0,
      lifetimeDist: this.lifetimeStats.lifetimeDist + (currentRunStats.distance || 0),
      nitroTimeUsed: this.lifetimeStats.nitroTimeUsed + (currentRunStats.nitroTime || 0)
    };

    for (const m of this.missions) {
      if (!m.completed && typeof m.progress === 'function') {
        const currentVal = m.progress(combinedStats);
        if (currentVal >= m.target) {
          this.completeMission(m);
        }
      }
    }
  }

  completeMission(mission) {
    mission.completed = true;
    this.completedMissions.push(mission.id);
    window.carManager.addCoins(mission.reward);
    this.saveData();

    // Trigger in-game celebratory banner & sound
    window.soundSystem.playCoin();
    const banner = document.getElementById('mission-popup-banner');
    if (banner) {
      banner.innerHTML = `🏆 مأموریت انجام شد: <b>${mission.title}</b> (+${mission.reward} 💰)`;
      banner.classList.add('show');
      setTimeout(() => banner.classList.remove('show'), 3000);
    }
  }

  recordRaceEnd(runStats) {
    this.lifetimeStats.totalRaces++;
    this.lifetimeStats.lifetimeDist += runStats.distance || 0;
    this.lifetimeStats.lifetimeCoins += runStats.sessionCoins || 0;
    this.lifetimeStats.lifetimeNearMisses += runStats.nearMisses || 0;
    this.lifetimeStats.nitroTimeUsed += runStats.nitroTime || 0;
    if (runStats.maxSpeed > this.lifetimeStats.highestSpeed) {
      this.lifetimeStats.highestSpeed = Math.floor(runStats.maxSpeed);
    }
    this.saveData();
  }

  renderMissionsUI() {
    const container = document.getElementById('missions-list-container');
    if (!container) return;
    container.innerHTML = '';

    for (const m of this.missions) {
      const card = document.createElement('div');
      card.className = `mission-item ${m.completed ? 'completed' : ''}`;

      card.innerHTML = `
        <div class="mission-info">
          <div class="mission-title">${m.completed ? '✓ ' : ''}${m.title}</div>
          <div class="mission-desc">${m.desc}</div>
        </div>
        <div class="mission-reward">
          <span>+${m.reward} 💰</span>
          <span class="mission-status">${m.completed ? 'تکمیل شد' : 'در حال انجام'}</span>
        </div>
      `;
      container.appendChild(card);
    }

    // Render Lifetime stats
    const statsContainer = document.getElementById('lifetime-stats-container');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-grid-row"><span>تعداد کل مسابقات:</span> <b>${this.lifetimeStats.totalRaces}</b></div>
        <div class="stat-grid-row"><span>کل مسافت رانده شده:</span> <b>${(this.lifetimeStats.lifetimeDist / 1000).toFixed(1)} km</b></div>
        <div class="stat-grid-row"><span>بالاترین سرعت ثبت شده:</span> <b>${this.lifetimeStats.highestSpeed} km/h</b></div>
        <div class="stat-grid-row"><span>مجموع لایی‌کشی‌ها:</span> <b>${this.lifetimeStats.lifetimeNearMisses}</b></div>
      `;
    }
  }
}

window.missionManager = new MissionManager();
