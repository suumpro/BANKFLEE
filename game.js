// 게임 상태 및 설정
const GAME_CONFIG = {
    WIDTH: 800,
    HEIGHT: 600,
    GROUND_Y: 500,
    GRAVITY: 0.5,
    JUMP_FORCE: -12,
    PLAYER_SPEED: 5
};

const GAME_STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = GAME_STATE.MENU;
        
        this.score = 0;
        this.health = 100;
        this.gameSpeed = 1;
        
        this.keys = {};
        this.lastTime = 0;
        
        // 오디오 시스템 초기화
        this.audioContext = null;
        this.initializeAudio();
        
        // 게임 오브젝트들
        this.player = null;
        this.ginkgoNuts = [];
        this.particles = [];
        this.powerUps = [];
        
        this.initializeEventListeners();
        this.initializeUI();
        
        // 게임 루프 시작
        this.gameLoop();
    }
    
    initializeEventListeners() {
        // 키보드 입력
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === ' ') {
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // 버튼 이벤트
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.startGame());
    }
    
    initializeUI() {
        this.updateScore();
        this.updateHealth();
    }
    
    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    playSound(type) {
        if (!this.audioContext) return;
        
        // 오디오 컨텍스트가 suspend 상태라면 resume
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        switch(type) {
            case 'jump':
                this.playJumpSound();
                break;
            case 'collision':
                this.playCollisionSound();
                break;
            case 'powerup':
                this.playPowerUpSound();
                break;
            case 'explosion':
                this.playExplosionSound();
                break;
            case 'gameover':
                this.playGameOverSound();
                break;
        }
    }
    
    playJumpSound() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.2);
    }
    
    playCollisionSound() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }
    
    playPowerUpSound() {
        // 파워업 수집 시 상승하는 멜로디
        const frequencies = [262, 330, 392, 523]; // C, E, G, C
        
        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + index * 0.1);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime + index * 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + index * 0.1 + 0.2);
            
            oscillator.start(this.audioContext.currentTime + index * 0.1);
            oscillator.stop(this.audioContext.currentTime + index * 0.1 + 0.2);
        });
    }
    
    playExplosionSound() {
        // 노이즈 기반 폭발 소리
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        noise.buffer = buffer;
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        noise.start(this.audioContext.currentTime);
        noise.stop(this.audioContext.currentTime + 0.5);
    }
    
    playGameOverSound() {
        // 하강하는 슬픈 멜로디
        const frequencies = [523, 466, 415, 349, 294]; // C, Bb, Ab, F, D
        
        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + index * 0.2);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime + index * 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + index * 0.2 + 0.4);
            
            oscillator.start(this.audioContext.currentTime + index * 0.2);
            oscillator.stop(this.audioContext.currentTime + index * 0.2 + 0.4);
        });
    }
    
    startGame() {
        this.state = GAME_STATE.PLAYING;
        this.score = 0;
        this.health = 100;
        this.gameSpeed = 1;
        
        // 플레이어 초기화
        this.player = new Player(100, GAME_CONFIG.GROUND_Y - 50);
        
        // 게임 오브젝트 초기화
        this.ginkgoNuts = [];
        this.particles = [];
        this.powerUps = [];
        
        // UI 업데이트
        this.updateScore();
        this.updateHealth();
        document.getElementById('gameOverScreen').classList.add('hidden');
        
        // 은행 생성 시작
        this.startGinkgoSpawner();
        this.startPowerUpSpawner();
    }
    
    pauseGame() {
        if (this.state === GAME_STATE.PLAYING) {
            this.state = GAME_STATE.PAUSED;
        } else if (this.state === GAME_STATE.PAUSED) {
            this.state = GAME_STATE.PLAYING;
        }
    }
    
    restartGame() {
        this.startGame();
    }
    
    gameOver() {
        this.state = GAME_STATE.GAME_OVER;
        
        // 게임 오버 사운드 재생
        this.playSound('gameover');
        
        // 타이머 정리
        if (this.ginkgoSpawner) {
            clearInterval(this.ginkgoSpawner);
            this.ginkgoSpawner = null;
        }
        if (this.powerUpSpawner) {
            clearInterval(this.powerUpSpawner);
            this.powerUpSpawner = null;
        }
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    startGinkgoSpawner() {
        // 기존 타이머 정리
        if (this.ginkgoSpawner) {
            clearInterval(this.ginkgoSpawner);
        }
        
        // 은행 생성 타이머
        this.ginkgoSpawner = setInterval(() => {
            if (this.state === GAME_STATE.PLAYING) {
                this.spawnGinkgoNut();
            }
        }, Math.max(500, 2000 - this.score * 2)); // 점수에 따라 생성 빈도 증가
    }
    
    spawnGinkgoNut() {
        const x = Math.random() * (GAME_CONFIG.WIDTH - 40) + 20;
        
        // 점수에 따른 타입 확률 조정
        const rand = Math.random();
        let type = 'normal';
        
        if (this.score > 1000 && rand < 0.03) { // 1000점 이후 3% 연쇄 은행
            type = 'chain';
        } else if (this.score > 500 && rand < 0.05) { // 500점 이후 5% 거대 은행
            type = 'giant';
        } else if (rand < 0.15 + this.score * 0.0001) { // 점수가 올라갈수록 썩은 은행 확률 증가
            type = 'rotten';
        }
        
        this.ginkgoNuts.push(new GinkgoNut(x, -30, type));
    }
    
    startPowerUpSpawner() {
        // 기존 타이머 정리
        if (this.powerUpSpawner) {
            clearInterval(this.powerUpSpawner);
        }
        
        // 파워업 생성 타이머 (20초마다)
        this.powerUpSpawner = setInterval(() => {
            if (this.state === GAME_STATE.PLAYING && Math.random() < 0.3) { // 30% 확률로 생성
                this.spawnPowerUp();
            }
        }, 20000);
    }
    
    spawnPowerUp() {
        const x = Math.random() * (GAME_CONFIG.WIDTH - 40) + 20;
        const types = ['mask', 'umbrella', 'boots', 'gas_mask'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        this.powerUps.push(new PowerUp(x, -30, randomType));
    }
    
    update(deltaTime) {
        if (this.state !== GAME_STATE.PLAYING) return;
        
        // 플레이어 업데이트
        this.player.update(this.keys, deltaTime);
        
        // 점프 사운드 재생
        if (this.player.justJumped) {
            this.playSound('jump');
        }
        
        // 은행 업데이트
        for (let i = this.ginkgoNuts.length - 1; i >= 0; i--) {
            const nut = this.ginkgoNuts[i];
            nut.update(deltaTime);
            
            // 화면 밖으로 나간 은행 제거 및 점수 증가
            if (nut.y > GAME_CONFIG.HEIGHT) {
                // 연쇄 은행이 바닥에 떨어지면 폭발
                if (nut.type === 'chain') {
                    this.createChainExplosion(nut.x, GAME_CONFIG.HEIGHT);
                }
                this.ginkgoNuts.splice(i, 1);
                this.score += 10;
                this.updateScore();
                continue;
            }
            
            // 충돌 체크
            if (this.checkCollision(this.player, nut)) {
                this.handleCollision(nut);
                this.ginkgoNuts.splice(i, 1);
            }
        }
        
        // 파워업 업데이트
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.update(deltaTime);
            
            // 화면 밖으로 나간 파워업 제거
            if (powerUp.y > GAME_CONFIG.HEIGHT) {
                this.powerUps.splice(i, 1);
                continue;
            }
            
            // 충돌 체크
            if (this.checkCollision(this.player, powerUp)) {
                this.collectPowerUp(powerUp);
                this.powerUps.splice(i, 1);
            }
        }
        
        // 파티클 업데이트
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);
            if (particle.isDead()) {
                this.particles.splice(i, 1);
            }
        }
        
        // 체력이 0이 되면 게임 오버
        if (this.health <= 0) {
            this.gameOver();
        }
        
        // 게임 속도 점진적 증가
        this.gameSpeed = Math.min(2, 1 + this.score * 0.001);
    }
    
    checkCollision(player, ginkgoNut) {
        return player.x < ginkgoNut.x + ginkgoNut.width &&
               player.x + player.width > ginkgoNut.x &&
               player.y < ginkgoNut.y + ginkgoNut.height &&
               player.y + player.height > ginkgoNut.y;
    }
    
    handleCollision(ginkgoNut) {
        // 플레이어 파워업 방어 체크
        const defense = this.player.canDefendAgainst(ginkgoNut.type);
        
        if (defense === 'ignore') {
            // 방독면으로 썩은 은행 완전 무시
            this.createCollectionEffect(ginkgoNut.x, ginkgoNut.y, 'gas_mask');
            return;
        } else if (defense === 'block') {
            // 우산으로 완전 방어
            this.createCollectionEffect(ginkgoNut.x, ginkgoNut.y, 'umbrella');
            return;
        }
        
        let damage;
        switch(ginkgoNut.type) {
            case 'rotten':
                damage = (defense === 'reduce') ? 10 : 20; // 마스크로 데미지 감소
                break;
            case 'giant':
                damage = 30;
                break;
            case 'chain':
                damage = 15;
                // 연쇄 폭발 효과 생성
                this.createChainExplosion(ginkgoNut.x, ginkgoNut.y);
                break;
            default:
                damage = 10;
        }
        
        this.health = Math.max(0, this.health - damage);
        this.updateHealth();
        
        // 충돌 사운드 재생
        this.playSound('collision');
        
        // 충돌 이펙트 생성
        this.createCollisionEffect(ginkgoNut.x, ginkgoNut.y, ginkgoNut.type);
    }
    
    collectPowerUp(powerUp) {
        // 파워업을 플레이어에게 적용
        this.player.applyPowerUp(powerUp.type);
        
        // 점수 보너스
        this.score += 50;
        this.updateScore();
        
        // 파워업 수집 사운드 재생
        this.playSound('powerup');
        
        // 수집 이펙트 생성
        this.createCollectionEffect(powerUp.x, powerUp.y, powerUp.type);
    }
    
    createCollisionEffect(x, y, type) {
        let color, particleCount;
        
        switch(type) {
            case 'rotten':
                color = '#8B4513';
                particleCount = 15;
                break;
            case 'giant':
                color = '#B8860B';
                particleCount = 20;
                break;
            case 'chain':
                color = '#FF6347';
                particleCount = 18;
                break;
            default:
                color = '#DAA520';
                particleCount = 10;
        }
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }
    
    createCollectionEffect(x, y, type) {
        // 파워업 수집 시 긍정적인 이펙트
        let color = '#00FF00'; // 기본은 초록색
        
        switch(type) {
            case 'mask':
                color = '#00BFFF';
                break;
            case 'umbrella':
                color = '#FF1493';
                break;
            case 'boots':
                color = '#FF4500';
                break;
            case 'gas_mask':
                color = '#32CD32';
                break;
        }
        
        for (let i = 0; i < 12; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }
    
    createChainExplosion(x, y) {
        // 폭발 사운드 재생
        this.playSound('explosion');
        
        // 연쇄 폭발로 4-6개의 작은 은행들이 사방으로 튀어나감
        const smallNutCount = Math.floor(Math.random() * 3) + 4; // 4-6개
        
        for (let i = 0; i < smallNutCount; i++) {
            // 각도를 균등하게 분배
            const angle = (i / smallNutCount) * Math.PI * 2;
            const speed = Math.random() * 3 + 2;
            const distance = Math.random() * 50 + 30;
            
            const newX = x + Math.cos(angle) * distance;
            const newY = y + Math.sin(angle) * distance;
            
            // 작은 은행열매 생성 (일반 타입, 작은 사이즈)
            const smallNut = new GinkgoNut(newX, newY, 'normal');
            smallNut.width = 15;
            smallNut.height = 15;
            smallNut.speed = speed;
            // 퍼져나가는 방향으로 초기 velocity 설정
            smallNut.vx = Math.cos(angle) * speed;
            smallNut.vy = Math.sin(angle) * speed;
            smallNut.isChainFragment = true; // 연쇄 폭발 조각임을 표시
            
            this.ginkgoNuts.push(smallNut);
        }
        
        // 폭발 이펙트 파티클
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(x, y, '#FF8C00'));
        }
    }
    
    render() {
        // 배경 그리기 (가을 하늘)
        const gradient = this.ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.HEIGHT);
        gradient.addColorStop(0, '#87CEEB'); // 하늘색
        gradient.addColorStop(0.7, '#FFA07A'); // 노을빛
        gradient.addColorStop(1, '#228B22'); // 땅색
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        
        // 지면 그리기
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, GAME_CONFIG.GROUND_Y, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT - GAME_CONFIG.GROUND_Y);
        
        // 서울 도심 배경 (간단한 빌딩들)
        this.drawCityBackground();
        
        if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED) {
            // 플레이어 렌더링
            if (this.player) {
                this.player.render(this.ctx);
            }
            
            // 은행 렌더링
            this.ginkgoNuts.forEach(nut => nut.render(this.ctx));
            
            // 파워업 렌더링
            this.powerUps.forEach(powerUp => powerUp.render(this.ctx));
            
            // 파티클 렌더링
            this.particles.forEach(particle => particle.render(this.ctx));
            
            // 일시정지 텍스트
            if (this.state === GAME_STATE.PAUSED) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
                this.ctx.fillStyle = 'white';
                this.ctx.font = '48px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('일시정지', GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2);
            }
        } else if (this.state === GAME_STATE.MENU) {
            // 메뉴 화면
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('시작 버튼을 눌러주세요!', GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2);
        }
        
        this.ctx.textAlign = 'left'; // 텍스트 정렬 초기화
    }
    
    drawCityBackground() {
        // 간단한 빌딩들
        const buildings = [
            {x: 50, y: 300, w: 80, h: 200, color: '#696969'},
            {x: 150, y: 250, w: 60, h: 250, color: '#708090'},
            {x: 230, y: 280, w: 90, h: 220, color: '#778899'},
            {x: 340, y: 220, w: 70, h: 280, color: '#696969'},
            {x: 430, y: 260, w: 85, h: 240, color: '#708090'},
            {x: 540, y: 200, w: 75, h: 300, color: '#778899'},
            {x: 640, y: 240, w: 80, h: 260, color: '#696969'},
            {x: 740, y: 290, w: 50, h: 210, color: '#708090'}
        ];
        
        buildings.forEach(building => {
            this.ctx.fillStyle = building.color;
            this.ctx.fillRect(building.x, building.y, building.w, building.h);
            
            // 빌딩 창문들
            this.ctx.fillStyle = '#FFFF99';
            for (let y = building.y + 20; y < building.y + building.h - 20; y += 30) {
                for (let x = building.x + 10; x < building.x + building.w - 10; x += 20) {
                    if (Math.random() < 0.7) { // 70% 확률로 불 켜진 창문
                        this.ctx.fillRect(x, y, 8, 12);
                    }
                }
            }
        });
    }
    
    updateScore() {
        document.getElementById('score').textContent = `점수: ${this.score}`;
    }
    
    updateHealth() {
        document.getElementById('health').textContent = `체력: ${this.health}`;
    }
    
    gameLoop(currentTime = 0) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Player 클래스
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 50;
        this.velocityY = 0;
        this.isOnGround = false;
        this.color = '#FF6B35';
        
        // 파워업 상태
        this.powerUps = {
            mask: { active: false, timer: 0 },
            umbrella: { active: false, uses: 0 },
            boots: { active: false, timer: 0 },
            gas_mask: { active: false, timer: 0 }
        };
    }
    
    update(keys, deltaTime) {
        // 좌우 이동 (부츠 파워업으로 속도 증가)
        const speed = this.powerUps.boots.active ? GAME_CONFIG.PLAYER_SPEED * 1.5 : GAME_CONFIG.PLAYER_SPEED;
        if (keys['arrowleft'] || keys['a']) {
            this.x = Math.max(0, this.x - speed);
        }
        if (keys['arrowright'] || keys['d']) {
            this.x = Math.min(GAME_CONFIG.WIDTH - this.width, this.x + speed);
        }
        
        // 점프
        this.justJumped = false;
        if ((keys[' '] || keys['arrowup'] || keys['w']) && this.isOnGround) {
            this.velocityY = GAME_CONFIG.JUMP_FORCE;
            this.isOnGround = false;
            this.justJumped = true; // 점프했음을 표시
        }
        
        // 중력 적용
        this.velocityY += GAME_CONFIG.GRAVITY;
        this.y += this.velocityY;
        
        // 지면 충돌 체크
        if (this.y + this.height >= GAME_CONFIG.GROUND_Y) {
            this.y = GAME_CONFIG.GROUND_Y - this.height;
            this.velocityY = 0;
            this.isOnGround = true;
        }
        
        // 파워업 타이머 업데이트
        this.updatePowerUpTimers(deltaTime);
    }
    
    render(ctx) {
        // 플레이어 박스 그리기
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 테두리
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // 간단한 얼굴
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x + 10, this.y + 10, 5, 5); // 왼쪽 눈
        ctx.fillRect(this.x + 25, this.y + 10, 5, 5); // 오른쪽 눈
        ctx.fillRect(this.x + 15, this.y + 25, 10, 3); // 입
    }
    
    applyPowerUp(type) {
        switch(type) {
            case 'mask':
                this.powerUps.mask.active = true;
                this.powerUps.mask.timer = 10000; // 10초
                break;
            case 'umbrella':
                this.powerUps.umbrella.active = true;
                this.powerUps.umbrella.uses = 1; // 1회 사용
                break;
            case 'boots':
                this.powerUps.boots.active = true;
                this.powerUps.boots.timer = 15000; // 15초
                break;
            case 'gas_mask':
                this.powerUps.gas_mask.active = true;
                this.powerUps.gas_mask.timer = 20000; // 20초
                break;
        }
    }
    
    updatePowerUpTimers(deltaTime) {
        // 시간 기반 파워업들 타이머 감소
        if (this.powerUps.mask.active) {
            this.powerUps.mask.timer -= deltaTime;
            if (this.powerUps.mask.timer <= 0) {
                this.powerUps.mask.active = false;
            }
        }
        
        if (this.powerUps.boots.active) {
            this.powerUps.boots.timer -= deltaTime;
            if (this.powerUps.boots.timer <= 0) {
                this.powerUps.boots.active = false;
            }
        }
        
        if (this.powerUps.gas_mask.active) {
            this.powerUps.gas_mask.timer -= deltaTime;
            if (this.powerUps.gas_mask.timer <= 0) {
                this.powerUps.gas_mask.active = false;
            }
        }
    }
    
    canDefendAgainst(ginkgoNutType) {
        // 방독면은 썩은 은행을 완전히 무시
        if (this.powerUps.gas_mask.active && ginkgoNutType === 'rotten') {
            return 'ignore';
        }
        
        // 마스크는 썩은 은행의 냄새 데미지만 방어
        if (this.powerUps.mask.active && ginkgoNutType === 'rotten') {
            return 'reduce';
        }
        
        // 우산은 모든 은행을 1회 방어
        if (this.powerUps.umbrella.active && this.powerUps.umbrella.uses > 0) {
            this.powerUps.umbrella.uses--;
            if (this.powerUps.umbrella.uses <= 0) {
                this.powerUps.umbrella.active = false;
            }
            return 'block';
        }
        
        return 'none';
    }
}

// GinkgoNut 클래스 (은행열매)
class GinkgoNut {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.type = type;
        this.speed = Math.random() * 3 + 2; // 2-5 속도
        this.rotation = 0;
        this.rotationSpeed = Math.random() * 0.2 - 0.1;
        this.vx = 0; // 연쇄 폭발용 x 속도
        this.vy = 0; // 연쇄 폭발용 y 속도
        this.isChainFragment = false; // 연쇄 폭발 조각인지 여부
        
        // 타입에 따른 색상 설정
        switch(type) {
            case 'normal':
                this.color = '#DAA520';
                break;
            case 'rotten':
                this.color = '#8B4513';
                this.width = 30;
                this.height = 30;
                break;
            case 'giant':
                this.color = '#B8860B';
                this.width = 40;
                this.height = 40;
                this.speed *= 0.7;
                break;
            case 'chain':
                this.color = '#FF6347';
                this.width = 35;
                this.height = 35;
                this.speed *= 0.8;
                break;
        }
    }
    
    update(deltaTime) {
        if (this.isChainFragment) {
            // 연쇄 폭발 조각들은 다른 물리 법칙
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.3; // 중력 적용
            this.vx *= 0.98; // 공기 저항
        } else {
            // 일반 은행열매 움직임
            this.y += this.speed;
            // 바람 효과 (좌우로 살짝 흔들림)
            this.x += Math.sin(this.y * 0.01) * 0.5;
        }
        
        this.rotation += this.rotationSpeed;
    }
    
    render(ctx) {
        ctx.save();
        
        // 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(this.x + 3, this.y + 3, this.width, this.height);
        
        // 회전 적용
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        // 은행열매 박스
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // 테두리
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // 타입별 추가 표시
        if (this.type === 'rotten') {
            // 썩은 은행 표시 (X 마크)
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-8, -8);
            ctx.lineTo(8, 8);
            ctx.moveTo(8, -8);
            ctx.lineTo(-8, 8);
            ctx.stroke();
        } else if (this.type === 'chain') {
            // 연쇄 은행 표시 (별표 마크)
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            // 별 모양 그리기
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const radius = (i % 2 === 0) ? 10 : 5;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// Particle 클래스 (이펙트용)
class Particle {
    constructor(x, y, color = '#DAA520') {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8 - 2;
        this.life = 1.0;
        this.decay = 0.02;
        this.size = Math.random() * 6 + 2;
        this.color = color;
    }
    
    update(deltaTime) {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // 중력
        this.life -= this.decay;
        this.size *= 0.99;
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
    
    isDead() {
        return this.life <= 0 || this.size <= 0.5;
    }
}

// PowerUp 클래스 (파워업 아이템)
class PowerUp {
    constructor(x, y, type = 'mask') {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.type = type;
        this.speed = 2; // 천천히 떨어짐
        this.bobOffset = 0; // 둥둥 떠다니는 효과용
        
        // 타입에 따른 색상과 특성 설정
        switch(type) {
            case 'mask':
                this.color = '#00BFFF';
                this.symbol = 'M';
                break;
            case 'umbrella':
                this.color = '#FF1493';
                this.symbol = 'U';
                break;
            case 'boots':
                this.color = '#FF4500';
                this.symbol = 'B';
                break;
            case 'gas_mask':
                this.color = '#32CD32';
                this.symbol = 'G';
                break;
        }
    }
    
    update(deltaTime) {
        this.y += this.speed;
        this.bobOffset += 0.05; // 둥둥 떠다니는 효과
    }
    
    render(ctx) {
        ctx.save();
        
        // 둥둥 떠다니는 효과
        const bobY = this.y + Math.sin(this.bobOffset) * 3;
        
        // 글로우 효과 (외곽선)
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        // 파워업 박스 그리기
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, bobY, this.width, this.height);
        
        // 테두리
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, bobY, this.width, this.height);
        
        // 심볼 텍스트
        ctx.fillStyle = '#FFF';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.symbol, this.x + this.width/2, bobY + this.height/2 + 7);
        
        ctx.restore();
    }
}

// =====================
// 플랫폼어(마리오-스타일) 구현
// =====================

// 플랫폼어 설정
const PF_CONFIG = {
    WIDTH: 800,
    HEIGHT: 600,
    TILE: 32,
    GRAVITY: 2000, // px/s^2
    RUN_ACCEL: 4000, // px/s^2
    RUN_FRICTION: 5000, // px/s^2 (지면에서 감속)
    AIR_FRICTION: 800, // 공중에서 감속
    MAX_RUN_SPEED: 280, // px/s (~8.75 tiles/s)
    JUMP_SPEED: 650, // px/s
    COYOTE_TIME: 0.10, // s
    JUMP_BUFFER: 0.12 // s
};

const PF_STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    LEVEL_COMPLETE: 'level_complete'
};

class PF_Input {
    constructor() {
        this.down = new Set();
        this.justDown = new Set();
        this.justUp = new Set();

        document.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if (!this.down.has(k)) this.justDown.add(k);
            this.down.add(k);
            if (e.key === ' ') e.preventDefault();
        });
        document.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if (this.down.has(k)) this.justUp.add(k);
            this.down.delete(k);
        });
    }
    isDown(k) { return this.down.has(k); }
    isLeft() { return this.isDown('arrowleft') || this.isDown('a'); }
    isRight() { return this.isDown('arrowright') || this.isDown('d'); }
    jumpDown() { return this.justDown.has(' ') || this.justDown.has('w') || this.justDown.has('arrowup'); }
    jumpUp() { return this.justUp.has(' ') || this.justUp.has('w') || this.justUp.has('arrowup'); }
    resetJusts() { this.justDown.clear(); this.justUp.clear(); }
}

class PF_TileMap {
    constructor(data) {
        this.tileSize = data.tileSize || PF_CONFIG.TILE;
        this.width = data.width;  // in tiles
        this.height = data.height; // in tiles
        this.solids = data.layers?.solids || [];
        this.hazards = data.layers?.hazards || [];

        if (!this.solids || this.solids.length === 0) {
            this._buildDefaultGround();
        }
    }

    _emptyGrid() {
        const g = new Array(this.height);
        for (let y = 0; y < this.height; y++) {
            g[y] = new Array(this.width).fill(0);
        }
        return g;
    }

    _buildDefaultGround() {
        // 기본 지형: 하단 3줄은 땅, 약간의 떠있는 플랫폼
        this.solids = this._emptyGrid();
        for (let y = this.height - 3; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) this.solids[y][x] = 1;
        }
        // 간단 플랫폼들
        const plats = [
            { x: 8, y: 12, w: 6 },
            { x: 22, y: 10, w: 4 },
            { x: 35, y: 8, w: 5 },
            { x: 48, y: 12, w: 6 },
            { x: 66, y: 9, w: 5 },
            { x: 80, y: 11, w: 7 },
            { x: 96, y: 10, w: 5 }
        ];
        plats.forEach(p => {
            for (let i = 0; i < p.w; i++) {
                if (p.x + i < this.width && p.y < this.height) this.solids[p.y][p.x + i] = 1;
            }
        });
    }

    isSolidTile(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return true; // 바깥은 벽
        return this.solids[ty]?.[tx] === 1;
    }

    render(ctx, camera) {
        const ts = this.tileSize;
        const startX = Math.max(0, Math.floor(camera.x / ts) - 1);
        const endX = Math.min(this.width, Math.ceil((camera.x + camera.w) / ts) + 1);
        const startY = Math.max(0, Math.floor(camera.y / ts) - 1);
        const endY = Math.min(this.height, Math.ceil((camera.y + camera.h) / ts) + 1);

        // 타일 색상
        ctx.fillStyle = '#5c7c3f'; // 녹색 땅
        for (let ty = startY; ty < endY; ty++) {
            for (let tx = startX; tx < endX; tx++) {
                if (this.isSolidTile(tx, ty)) {
                    const sx = tx * ts - camera.x;
                    const sy = ty * ts - camera.y;
                    ctx.fillRect(sx, sy, ts, ts);
                }
            }
        }
    }
}

class PF_Camera {
    constructor(viewW, viewH, map) {
        this.w = viewW;
        this.h = viewH;
        this.map = map;
        this.x = 0;
        this.y = 0;
        this.deadZoneX = viewW * 0.35;
    }
    follow(px, py) {
        // 수평 추적만 우선
        const targetX = px - this.deadZoneX;
        this.x = Math.max(0, Math.min(targetX, this.map.width * this.map.tileSize - this.w));
        this.y = 0; // 수직은 고정 (v1)
    }
}

class PF_Coin {
    constructor(x, y) {
        this.w = 16; this.h = 16;
        this.x = x - this.w / 2; // center to top-left
        this.y = y - this.h / 2;
        this.collected = false;
    }
    render(ctx, camera) {
        const sx = Math.floor(this.x - camera.x);
        const sy = Math.floor(this.y - camera.y);
        ctx.save();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(sx + this.w/2, sy + this.h/2, this.w/2, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}

class PF_Goal {
    constructor(x, y, w, h) {
        // x,y는 상단-좌표(타일 기준)로 저장
        this.x = x; this.y = y; this.w = w; this.h = h;
    }
    render(ctx, camera) {
        const sx = Math.floor(this.x - camera.x);
        const sy = Math.floor(this.y - camera.y);
        // 간단 깃발 (상단에서 아래로)
        ctx.save();
        ctx.fillStyle = '#654321';
        ctx.fillRect(sx + this.w - 6, sy, 6, this.h + 8); // 기둥
        ctx.fillStyle = '#FF3B3B';
        ctx.beginPath();
        ctx.moveTo(sx + this.w - 6, sy + 6);
        ctx.lineTo(sx + this.w - 6 - this.w * 0.8, sy + 14);
        ctx.lineTo(sx + this.w - 6, sy + 22);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

// Hazard helpers
const PF_HAZARD = {
    NONE: 0,
    SPIKES: 1,
    GAS: 2
};

// Enemy config
const PF_ENEMY = {
    WALK_SPEED: 70,   // px/s
    GRAVITY: 2000
};

class PF_Enemy {
    constructor(x, y, w = 24, h = 24) {
        this.x = x; this.y = y; this.w = w; this.h = h;
        this.vx = 0; this.vy = 0;
        this.onGround = false;
        this.alive = true;
        this.color = '#C23B22';
    }
    update(dt, map) {}
    render(ctx, camera) {
        if (!this.alive) return;
        const sx = Math.floor(this.x - camera.x);
        const sy = Math.floor(this.y - camera.y);
        ctx.fillStyle = this.color;
        ctx.fillRect(sx, sy, this.w, this.h);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, this.w, this.h);
    }
}

class PF_PatrolEnemy extends PF_Enemy {
    constructor(x, y, rangePx = 200, dir = 1) {
        super(x, y, 24, 24);
        this.speed = PF_ENEMY.WALK_SPEED;
        this.dir = Math.sign(dir) || 1;
        this.minX = x - rangePx;
        this.maxX = x + rangePx;
    }
    update(dt, map) {
        if (!this.alive) return;
        // Horizontal intent
        this.vx = this.dir * this.speed;
        // Gravity
        this.vy += PF_ENEMY.GRAVITY * dt;
        // Move axis
        this._moveAxis(dt, map, true);
        this._moveAxis(dt, map, false);

        // Reverse at range bounds
        if (this.x < this.minX) { this.x = this.minX; this.dir = 1; }
        if (this.x + this.w > this.maxX) { this.x = this.maxX - this.w; this.dir = -1; }
    }
    _moveAxis(dt, map, isX) {
        const ts = map.tileSize;
        const half = 0.001;
        let nx = this.x + (isX ? this.vx * dt : 0);
        let ny = this.y + (!isX ? this.vy * dt : 0);

        if (isX) {
            if (this.vx > 0) {
                const right = Math.floor((nx + this.w) / ts);
                const top = Math.floor(this.y / ts);
                const bottom = Math.floor((this.y + this.h - half) / ts);
                for (let ty = top; ty <= bottom; ty++) {
                    if (map.isSolidTile(right, ty)) { nx = right * ts - this.w; this.dir = -1; break; }
                }
            } else if (this.vx < 0) {
                const left = Math.floor(nx / ts);
                const top = Math.floor(this.y / ts);
                const bottom = Math.floor((this.y + this.h - half) / ts);
                for (let ty = top; ty <= bottom; ty++) {
                    if (map.isSolidTile(left, ty)) { nx = (left + 1) * ts; this.dir = 1; break; }
                }
            }
            this.x = nx;
        } else {
            this.onGround = false;
            if (this.vy > 0) {
                const bottom = Math.floor((ny + this.h) / ts);
                const left = Math.floor(this.x / ts);
                const right = Math.floor((this.x + this.w - half) / ts);
                for (let tx = left; tx <= right; tx++) {
                    if (map.isSolidTile(tx, bottom)) { ny = bottom * ts - this.h; this.vy = 0; this.onGround = true; break; }
                }
            } else if (this.vy < 0) {
                const top = Math.floor(ny / ts);
                const left = Math.floor(this.x / ts);
                const right = Math.floor((this.x + this.w - half) / ts);
                for (let tx = left; tx <= right; tx++) {
                    if (map.isSolidTile(tx, top)) { ny = (top + 1) * ts; this.vy = 0; break; }
                }
            }
            this.y = ny;
        }
    }
    render(ctx, camera) {
        this.color = '#8B0000';
        super.render(ctx, camera);
        // eyes
        const sx = Math.floor(this.x - camera.x);
        const sy = Math.floor(this.y - camera.y);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(sx + 6, sy + 6, 4, 4);
        ctx.fillRect(sx + this.w - 10, sy + 6, 4, 4);
    }
}

class PF_Player {
    constructor(x, y) {
        this.w = 26;
        this.h = 30;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.coyote = 0;
        this.jumpBuf = 0;
        this.color = '#FF6B35';

        // 파워업 상태
        this.powerUps = {
            mask: { active: false, timer: 0 },
            gas_mask: { active: false, timer: 0 },
            boots: { active: false, timer: 0 },
            umbrella: { active: false, uses: 0 }
        };
    }

    update(dt, input, map) {
        // 입력 처리
        const left = input.isLeft();
        const right = input.isRight();
        const want = (left ? -1 : 0) + (right ? 1 : 0);

        if (input.jumpDown()) this.jumpBuf = PF_CONFIG.JUMP_BUFFER;

        // 부츠 효과: 가속/최속 강화
        const accel = PF_CONFIG.RUN_ACCEL * (this.powerUps.boots.active ? 1.2 : 1.0);
        const maxRun = PF_CONFIG.MAX_RUN_SPEED * (this.powerUps.boots.active ? 1.25 : 1.0);

        // 수평 가속/마찰
        if (want !== 0) {
            this.vx += want * accel * dt;
        } else {
            const fric = (this.onGround ? PF_CONFIG.RUN_FRICTION : PF_CONFIG.AIR_FRICTION) * dt;
            if (Math.abs(this.vx) <= fric) this.vx = 0; else this.vx -= Math.sign(this.vx) * fric;
        }
        // 속도 클램프
        this.vx = Math.max(-maxRun, Math.min(maxRun, this.vx));

        // 점프 (코요테 + 버퍼)
        const jumpSpeed = PF_CONFIG.JUMP_SPEED * (this.powerUps.boots.active ? 1.12 : 1.0);
        if (this.jumpBuf > 0 && (this.onGround || this.coyote > 0)) {
            this.vy = -jumpSpeed;
            this.onGround = false;
            this.coyote = 0;
            this.jumpBuf = 0;
        }
        // 가변 점프
        if (input.jumpUp() && this.vy < 0) {
            this.vy *= 0.5;
        }

        // 중력
        this.vy += PF_CONFIG.GRAVITY * dt;

        // 이동 & 충돌 (X축)
        this._moveAxis(dt, map, true);
        // 이동 & 충돌 (Y축)
        this._moveAxis(dt, map, false);

        // 타이머 업데이트
        this.coyote = this.onGround ? PF_CONFIG.COYOTE_TIME : Math.max(0, this.coyote - dt);
        this.jumpBuf = Math.max(0, this.jumpBuf - dt);

        // 파워업 타이머 업데이트
        this.updatePowerUpTimers(dt);
    }

    _moveAxis(dt, map, isX) {
        const ts = map.tileSize;
        let nx = this.x + (isX ? this.vx * dt : 0);
        let ny = this.y + (!isX ? this.vy * dt : 0);

        const half = 0.001; // 작은 여유값
        if (isX) {
            if (this.vx > 0) {
                // 오른쪽 이동 — 오른쪽 변의 타일 검사
                const right = Math.floor((nx + this.w) / ts);
                const top = Math.floor(this.y / ts);
                const bottom = Math.floor((this.y + this.h - half) / ts);
                for (let ty = top; ty <= bottom; ty++) {
                    if (map.isSolidTile(right, ty)) {
                        nx = right * ts - this.w; this.vx = 0; break;
                    }
                }
            } else if (this.vx < 0) {
                const left = Math.floor(nx / ts);
                const top = Math.floor(this.y / ts);
                const bottom = Math.floor((this.y + this.h - half) / ts);
                for (let ty = top; ty <= bottom; ty++) {
                    if (map.isSolidTile(left, ty)) {
                        nx = (left + 1) * ts; this.vx = 0; break;
                    }
                }
            }
            this.x = nx;
        } else {
            this.onGround = false;
            if (this.vy > 0) {
                const bottom = Math.floor((ny + this.h) / ts);
                const left = Math.floor(this.x / ts);
                const right = Math.floor((this.x + this.w - half) / ts);
                for (let tx = left; tx <= right; tx++) {
                    if (map.isSolidTile(tx, bottom)) {
                        ny = bottom * ts - this.h; this.vy = 0; this.onGround = true; break;
                    }
                }
            } else if (this.vy < 0) {
                const top = Math.floor(ny / ts);
                const left = Math.floor(this.x / ts);
                const right = Math.floor((this.x + this.w - half) / ts);
                for (let tx = left; tx <= right; tx++) {
                    if (map.isSolidTile(tx, top)) {
                        ny = (top + 1) * ts; this.vy = 0; break;
                    }
                }
            }
            this.y = ny;
        }
    }

    render(ctx, camera) {
        ctx.fillStyle = this.color;
        ctx.fillRect(Math.floor(this.x - camera.x), Math.floor(this.y - camera.y), this.w, this.h);
        // 간단 얼굴
        ctx.fillStyle = '#333';
        ctx.fillRect(Math.floor(this.x - camera.x + 6), Math.floor(this.y - camera.y + 6), 4, 4);
        ctx.fillRect(Math.floor(this.x - camera.x + 16), Math.floor(this.y - camera.y + 6), 4, 4);
    }

    applyPowerUp(type) {
        switch (type) {
            case 'mask':
                this.powerUps.mask.active = true;
                this.powerUps.mask.timer = 10000; // ms
                break;
            case 'gas_mask':
                this.powerUps.gas_mask.active = true;
                this.powerUps.gas_mask.timer = 20000; // ms
                break;
            case 'boots':
                this.powerUps.boots.active = true;
                this.powerUps.boots.timer = 15000; // ms
                break;
            case 'umbrella':
                this.powerUps.umbrella.active = true;
                this.powerUps.umbrella.uses += 1; // 누적 가능
                break;
        }
    }

    updatePowerUpTimers(dt) {
        const dms = dt * 1000;
        // 시간형 파워업 감소
        if (this.powerUps.mask.active) {
            this.powerUps.mask.timer -= dms;
            if (this.powerUps.mask.timer <= 0) this.powerUps.mask.active = false;
        }
        if (this.powerUps.gas_mask.active) {
            this.powerUps.gas_mask.timer -= dms;
            if (this.powerUps.gas_mask.timer <= 0) this.powerUps.gas_mask.active = false;
        }
        if (this.powerUps.boots.active) {
            this.powerUps.boots.timer -= dms;
            if (this.powerUps.boots.timer <= 0) this.powerUps.boots.active = false;
        }
    }
}

// 파워업 엔티티
class PF_PowerUp {
    constructor(x, y, type) {
        this.type = type;
        this.w = 24; this.h = 24;
        // x,y는 월드 중심 좌표로 가정 → 좌상단 보정
        this.x = x - this.w / 2;
        this.y = y - this.h / 2;
        this.bob = Math.random() * Math.PI * 2;
    }
    update(dt) { this.bob += dt * 4; }
    render(ctx, camera) {
        const sx = Math.floor(this.x - camera.x);
        const sy = Math.floor(this.y - camera.y + Math.sin(this.bob) * 2);
        const colorMap = { mask: '#00BFFF', umbrella: '#FF1493', boots: '#FF4500', gas_mask: '#32CD32' };
        const symMap = { mask: 'M', umbrella: 'U', boots: 'B', gas_mask: 'G' };
        ctx.save();
        ctx.shadowColor = colorMap[this.type] || '#fff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = colorMap[this.type] || '#fff';
        ctx.fillRect(sx, sy, this.w, this.h);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, this.w, this.h);
        ctx.fillStyle = '#FFF'; ctx.font = '16px Arial'; ctx.textAlign = 'center';
        ctx.fillText(symMap[this.type] || '?', sx + this.w/2, sy + this.h/2 + 6);
        ctx.restore();
    }
}

class PlatformerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = PF_STATE.MENU;
        this.input = new PF_Input();
        this.health = 100;
        this.score = 0;
        this.coins = [];
        this.collectedCoins = 0;
        this.goal = null;
        this.spikes = [];
        this.gasZones = [];
        this.iframes = 0; // 무적 시간(피격 후 짧게)
        this.enemies = [];
        this.powerUps = [];

        // 레벨 구성 (짧은 레벨 여러 개)
        this.levels = ['levels/level1.json', 'levels/level2.json'];
        this.levelIndex = 0;

        // 루프 관련
        this.lastTime = 0;
        this.acc = 0;
        this.fixed = 1 / 60;

        // 월드
        this.map = null;
        this.player = null;
        this.camera = null;

        // UI
        this._bindUI();
        this._updateHUD();

        // 레벨 로드
        this._loadLevelByIndex(0);

        // 루프 시작
        requestAnimationFrame((t) => this._loop(t));
    }

    _bindUI() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.levelIndex = 0;
            this._loadLevelByIndex(0).then(() => this.start());
        });
    }

    async _loadLevel(url) {
        try {
            const res = await fetch(url);
            const data = await res.json();
            this.map = new PF_TileMap(data);
            const ts = this.map.tileSize;
            const spawn = data.entities?.player || { x: 2, y: this.map.height - 5 };
            this.player = new PF_Player(spawn.x * ts + 3, spawn.y * ts - 2);
            this.camera = new PF_Camera(PF_CONFIG.WIDTH, PF_CONFIG.HEIGHT, this.map);
            // 엔티티 파싱
            this.coins = [];
            this.collectedCoins = 0;
            const coinTiles = data.entities?.coins || [];
            for (const c of coinTiles) {
                const cx = (c.x ?? c[0]) * ts + ts / 2;
                const cy = (c.y ?? c[1]) * ts + ts / 2;
                this.coins.push(new PF_Coin(cx, cy));
            }
            const goal = data.entities?.goal;
            // goal.y는 바닥 타일 높이라고 가정 → 깃발 높이 2타일, 상단-좌표 = (y-2)타일
            this.goal = goal ? new PF_Goal(goal.x * ts, (goal.y - 2) * ts, ts, ts * 2) : null;

            // 해저드 파싱 (스파이크 라인, 가스 존)
            this.spikes = [];
            const spikes = data.entities?.spikes || [];
            for (const s of spikes) {
                const sx = (s.x ?? 0) * ts;
                const sy = (s.y ?? 0) * ts;
                const sw = (s.w ?? 1) * ts;
                const sh = ts; // 1타일 높이
                this.spikes.push({ x: sx, y: sy, w: sw, h: sh });
            }
            this.gasZones = [];
            const gas = data.entities?.gas || data.entities?.gasZones || [];
            for (const g of gas) {
                const gx = (g.x ?? 0) * ts;
                const gy = (g.y ?? 0) * ts;
                const gw = (g.w ?? 1) * ts;
                const gh = (g.h ?? 1) * ts;
                this.gasZones.push({ x: gx, y: gy, w: gw, h: gh });
            }

            // 적 파싱
            this.enemies = [];
            const enemies = data.entities?.enemies || [];
            for (const e of enemies) {
                const type = e.type || 'patrol';
                if (type === 'patrol') {
                    const ex = (e.x ?? 0) * ts;
                    const ey = (e.y ?? 0) * ts - 24; // 살짝 위에서 시작해 떨어지도록
                    const rangePx = (e.range ?? 6) * ts;
                    const dir = e.dir ?? 1;
                    this.enemies.push(new PF_PatrolEnemy(ex, ey, rangePx, dir));
                }
            }
            // 파워업 파싱
            this.powerUps = [];
            const pows = data.entities?.powerUps || [];
            for (const p of pows) {
                const type = p.type || 'boots';
                const px = (p.x ?? 0) * ts + ts / 2;
                const py = (p.y ?? 0) * ts + ts / 2;
                this.powerUps.push(new PF_PowerUp(px, py, type));
            }

            this._renderOnceMenu();
        } catch (e) {
            console.error('레벨 로드 실패', e);
        }
    }

    async _loadLevelByIndex(i) {
        this.levelIndex = i;
        await this._loadLevel(this.levels[i]);
        this.state = PF_STATE.MENU;
        this._updateHUD();
    }

    start() {
        if (!this.map) return;
        this.state = PF_STATE.PLAYING;
        this.health = 100;
        // 점수는 누적 유지
        document.getElementById('gameOverScreen').classList.add('hidden');
        const overTitle = document.querySelector('#gameOverScreen h2');
        if (overTitle) overTitle.textContent = '게임 오버!';
        this._updateHUD();
    }

    togglePause() {
        if (this.state === PF_STATE.PLAYING) this.state = PF_STATE.PAUSED;
        else if (this.state === PF_STATE.PAUSED) this.state = PF_STATE.PLAYING;
    }

    restart() {
        this._loadLevelByIndex(this.levelIndex).then(() => this.start());
    }

    gameOver() {
        this.state = PF_STATE.GAME_OVER;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    win() {
        this.state = PF_STATE.GAME_OVER; // 동일 오버레이 재사용
        const overTitle = document.querySelector('#gameOverScreen h2');
        if (overTitle) overTitle.textContent = '게임 클리어!';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    _updateHUD() {
        const scoreEl = document.getElementById('score');
        const healthEl = document.getElementById('health');
        const coinsEl = document.getElementById('coins');
        const levelEl = document.getElementById('level');
        const powEl = document.getElementById('powerups');
        if (scoreEl) scoreEl.textContent = `점수: ${this.score}`;
        if (healthEl) healthEl.textContent = `체력: ${this.health}`;
        if (coinsEl) coinsEl.textContent = `코인: ${this.collectedCoins}`;
        if (levelEl) levelEl.textContent = `레벨: ${this.levelIndex + 1}`;
        if (powEl) powEl.textContent = `파워업: ${this._powerupText()}`;
    }

    _powerupText() {
        if (!this.player) return '-';
        const p = this.player.powerUps;
        const parts = [];
        if (p.umbrella.uses > 0) parts.push(`U×${p.umbrella.uses}`);
        if (p.boots.active) parts.push(`B ${Math.ceil(p.boots.timer/1000)}s`);
        if (p.mask.active) parts.push(`M ${Math.ceil(p.mask.timer/1000)}s`);
        if (p.gas_mask.active) parts.push(`G ${Math.ceil(p.gas_mask.timer/1000)}s`);
        return parts.length ? parts.join(' | ') : '-';
    }

    _loop(current) {
        const now = current / 1000;
        let dt = this.lastTime ? now - this.lastTime : 0;
        if (dt > 0.25) dt = 0.25; // 스파이크 방지
        this.lastTime = now;
        this.acc += dt;

        while (this.acc >= this.fixed) {
            this.input.resetJusts();
            this._update(this.fixed);
            this.acc -= this.fixed;
        }
        this._render();
        requestAnimationFrame((t) => this._loop(t));
    }

    _update(dt) {
        if (this.state !== PF_STATE.PLAYING) return;
        if (!this.map || !this.player) return;

        this.player.update(dt, this.input, this.map);
        this.camera.follow(this.player.x, this.player.y);

        // 적/파워업 업데이트
        for (const en of this.enemies) en.update(dt, this.map);
        for (const pu of this.powerUps) pu.update(dt);
        this._checkEnemyCollisions();

        // 해저드 체크
        this._checkHazards(dt);

        // 코인 수집
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const c = this.coins[i];
            if (this._aabb(this.player.x, this.player.y, this.player.w, this.player.h, c.x, c.y, c.w, c.h)) {
                this.coins.splice(i, 1);
                this.collectedCoins += 1;
                this.score += 10; // 코인 점수
                this._updateHUD();
            }
        }

        // 파워업 수집
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const p = this.powerUps[i];
            if (this._aabb(this.player.x, this.player.y, this.player.w, this.player.h, p.x, p.y, p.w, p.h)) {
                this.player.applyPowerUp(p.type);
                this.powerUps.splice(i, 1);
                this.score += 20;
                this._updateHUD();
            }
        }

        // 골 도달 → 다음 레벨
        if (this.goal && this._aabb(this.player.x, this.player.y, this.player.w, this.player.h, this.goal.x, this.goal.y, this.goal.w, this.goal.h)) {
            this.state = PF_STATE.LEVEL_COMPLETE;
            this.score += 100; // 클리어 보너스
            this._updateHUD();
            setTimeout(() => this.nextLevel(), 600);
            return;
        }

        // 낙하사 (지도 밖으로 떨어지면 체력 0)
        const worldH = this.map.height * this.map.tileSize;
        if (this.player.y > worldH + 200) {
            this.health = 0;
            this._updateHUD();
            this.gameOver();
        }
    }

    _drawBackground() {
        // 하늘 그라디언트
        const g = this.ctx.createLinearGradient(0, 0, 0, PF_CONFIG.HEIGHT);
        g.addColorStop(0, '#87CEEB');
        g.addColorStop(0.7, '#FFA07A');
        g.addColorStop(1, '#228B22');
        this.ctx.fillStyle = g;
        this.ctx.fillRect(0, 0, PF_CONFIG.WIDTH, PF_CONFIG.HEIGHT);

        // 간단 패럴랙스 건물 (카메라의 절반 속도)
        const parallaxX = Math.floor(this.camera ? this.camera.x * 0.5 : 0);
        const rng = [
            { w: 80, h: 220, c: '#696969' },
            { w: 60, h: 260, c: '#708090' },
            { w: 90, h: 240, c: '#778899' },
            { w: 70, h: 280, c: '#696969' }
        ];
        let x = - (parallaxX % 200) - 200;
        while (x < PF_CONFIG.WIDTH + 200) {
            rng.forEach(b => {
                this.ctx.fillStyle = b.c;
                this.ctx.fillRect(x, PF_CONFIG.HEIGHT - b.h - 100, b.w, b.h);
                x += b.w + 30;
            });
            x += 100;
        }
    }

    _renderOnceMenu() {
        this._drawBackground();
        // 지면 띠
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, PF_CONFIG.HEIGHT - 100, PF_CONFIG.WIDTH, 100);

        if (this.map) this.map.render(this.ctx, new PF_Camera(PF_CONFIG.WIDTH, PF_CONFIG.HEIGHT, this.map));
        if (this.player) this.player.render(this.ctx, { x: 0, y: 0 });

        // 메뉴 텍스트 오버레이는 기존 render에서 처리
    }

    _render() {
        this._drawBackground();

        // 지면 띠 (전경용)
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, PF_CONFIG.HEIGHT - 100, PF_CONFIG.WIDTH, 100);

        if (this.map && this.camera) this.map.render(this.ctx, this.camera);
        // 해저드 렌더링 (플레이어 아래에)
        this._renderHazards();
        if (this.goal && this.camera) this.goal.render(this.ctx, this.camera);
        if (this.powerUps && this.camera) this.powerUps.forEach(p => p.render(this.ctx, this.camera));
        if (this.enemies && this.camera) this.enemies.forEach(en => en.render(this.ctx, this.camera));
        if (this.coins && this.camera) this.coins.forEach(c => c.render(this.ctx, this.camera));
        if (this.player && this.camera) this.player.render(this.ctx, this.camera);

        if (this.state === PF_STATE.PAUSED) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, PF_CONFIG.WIDTH, PF_CONFIG.HEIGHT);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('일시정지', PF_CONFIG.WIDTH / 2, PF_CONFIG.HEIGHT / 2);
        } else if (this.state === PF_STATE.MENU) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, PF_CONFIG.WIDTH, PF_CONFIG.HEIGHT);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('시작 버튼을 눌러주세요!', PF_CONFIG.WIDTH / 2, PF_CONFIG.HEIGHT / 2);
        } else if (this.state === PF_STATE.LEVEL_COMPLETE) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(0, 0, PF_CONFIG.WIDTH, PF_CONFIG.HEIGHT);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('레벨 클리어!', PF_CONFIG.WIDTH / 2, PF_CONFIG.HEIGHT / 2);
        }

        this.ctx.textAlign = 'left';
    }

    _aabb(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    nextLevel() {
        if (this.levelIndex + 1 < this.levels.length) {
            this._loadLevelByIndex(this.levelIndex + 1).then(() => this.start());
        } else {
            this.win();
        }
    }

    _checkEnemyCollisions() {
        if (this.iframes > 0) return; // 피격 무적 중에는 스킵 (스톰프는 허용 가능하지만 단순화)
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (!e.alive) continue;
            if (this._aabb(this.player.x, this.player.y, this.player.w, this.player.h, e.x, e.y, e.w, e.h)) {
                const fromAbove = (this.player.vy > 0) && ((this.player.y + this.player.h) - e.y < 10);
                if (fromAbove) {
                    // 스톰프: 적 제거 + 점수 + 바운스
                    e.alive = false;
                    this.enemies.splice(i, 1);
                    this.score += 30;
                    this.player.vy = -PF_CONFIG.JUMP_SPEED * 0.55;
                    this._updateHUD();
                } else {
                    // 접촉 피해
                    this._damage(25, 'enemy');
                    this.iframes = 0.6;
                    // 살짝 튕겨내기
                    const pcx = this.player.x + this.player.w / 2;
                    const ecx = e.x + e.w / 2;
                    const dir = pcx < ecx ? -1 : 1;
                    this.player.vx = dir * PF_CONFIG.MAX_RUN_SPEED * 0.6;
                    this.player.vy = -PF_CONFIG.JUMP_SPEED * 0.35;
                }
            }
        }
    }

    _checkHazards(dt) {
        // 피격 무적 감소
        if (this.iframes > 0) this.iframes = Math.max(0, this.iframes - dt);

        // Gas: 영역 안에 있으면 지속 데미지
        let inGas = false;
        for (const g of this.gasZones) {
            if (this._aabb(this.player.x, this.player.y, this.player.w, this.player.h, g.x, g.y, g.w, g.h)) {
                inGas = true; break;
            }
        }
        if (inGas) {
            let dps = 15;
            if (this.player.powerUps.gas_mask.active) dps = 0;
            else if (this.player.powerUps.mask.active) dps *= 0.4;
            if (dps > 0) this._damage(dps * dt, 'gas');
        }

        // Spikes: 닿는 즉시 큰 데미지 (상단 14px 밴드만 유효)
        if (this.iframes <= 0) {
            for (const s of this.spikes) {
                const bandH = 14;
                const bx = s.x;
                const by = s.y + (s.h - bandH);
                const bw = s.w;
                const bh = bandH;
                if (this._aabb(this.player.x, this.player.y, this.player.w, this.player.h, bx, by, bw, bh)) {
                    this._damage(35, 'spikes');
                    this.iframes = 0.6;
                    break;
                }
            }
        }
    }

    _damage(amount, type) {
        if (this.state !== PF_STATE.PLAYING) return;
        // 우산: 1회 피해 무시
        if (this.player.powerUps.umbrella.active && this.player.powerUps.umbrella.uses > 0) {
            this.player.powerUps.umbrella.uses -= 1;
            if (this.player.powerUps.umbrella.uses <= 0) this.player.powerUps.umbrella.active = false;
            this.iframes = Math.max(this.iframes, 0.4);
            this._updateHUD();
            return;
        }
        this.health = Math.max(0, this.health - amount);
        this._updateHUD();
        if (this.health <= 0) this.gameOver();
    }

    _renderHazards() {
        if (!this.camera) return;
        const ctx = this.ctx;
        // Spikes
        ctx.save();
        ctx.fillStyle = '#AA3333';
        for (const s of this.spikes) {
            const tiles = Math.max(1, Math.floor(s.w / PF_CONFIG.TILE));
            for (let i = 0; i < tiles; i++) {
                const x0 = s.x + i * PF_CONFIG.TILE - this.camera.x;
                const y0 = s.y - this.camera.y;
                const w = PF_CONFIG.TILE;
                const h = PF_CONFIG.TILE;
                ctx.beginPath();
                ctx.moveTo(x0, y0 + h);
                ctx.lineTo(x0 + w / 2, y0 + h - 16);
                ctx.lineTo(x0 + w, y0 + h);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#5c1f1f';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x0, y0 + h);
                ctx.lineTo(x0 + w, y0 + h);
                ctx.stroke();
            }
        }
        ctx.restore();

        // Gas zones
        ctx.save();
        ctx.globalAlpha = 0.35;
        for (const g of this.gasZones) {
            const sx = g.x - this.camera.x;
            const sy = g.y - this.camera.y;
            const grad = ctx.createLinearGradient(0, sy, 0, sy + g.h);
            grad.addColorStop(0, '#7CFC00');
            grad.addColorStop(1, '#228B22');
            ctx.fillStyle = grad;
            ctx.fillRect(sx, sy, g.w, g.h);
        }
        ctx.restore();
    }
}

// 게임 시작 (플랫폼어)
document.addEventListener('DOMContentLoaded', () => {
    new PlatformerGame();
});
