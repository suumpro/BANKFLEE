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

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});