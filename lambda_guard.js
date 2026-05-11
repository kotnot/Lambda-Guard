// lambda_guard.js - ПРОДВИНУТАЯ АНТИЧИТ СИСТЕМА
(function() {
    'use strict';
    
    const config = {
        allowedFiles: ['game.js', 'index.html'],
        protectedVariables: ['playerHealth', 'playerScore', 'playerKills', 'playerLevel', 'ammo', 'godMode'],
        blockedMethods: ['eval', 'Function', 'setTimeout', 'setInterval', 'fetch', 'WebSocket', 'XMLHttpRequest'],
        antiDebug: true,
        integrityCheckInterval: 3000
    };
    
    class LambdaGuard {
        constructor() {
            this.violations = [];
            this.protectedData = new Map();
            this.init();
        }
        
        init() {
            console.log("%c🛡️ LAMBDA GUARD ACTIVATED 🛡️", "color: #00ff88; font-size: 16px; font-weight: bold");
            console.log("%cЗащита игровых переменных активирована", "color: #ff6600");
            
            this.protectGlobalScope();
            this.protectGameVariables();
            this.blockCheatMethods();
            this.setupIntegrityCheck();
            this.hookGameFunctions();
            
            window.LambdaGuardAPI = this.createSafeAPI();
        }
        
        protectGlobalScope() {
            // Защищаем важные глобальные объекты
            const protectedGlobals = ['localStorage', 'sessionStorage', 'fetch', 'WebSocket'];
            protectedGlobals.forEach(global => {
                if (window[global]) {
                    const original = window[global];
                    Object.defineProperty(window, global, {
                        get: () => {
                            this.logViolation(`Доступ к ${global}`);
                            return null;
                        },
                        configurable: false
                    });
                }
            });
            
            // Блокируем консольные методы для читеров
            if (!this.isDebugMode()) {
                const noop = () => {};
                const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'];
                consoleMethods.forEach(method => {
                    if (method !== 'error') {
                        window.console[method] = noop;
                    }
                });
            }
        }
        
        protectGameVariables() {
            // Создаём защищённое хранилище для игровых переменных
            const handler = {
                set: (target, prop, value) => {
                    if (config.protectedVariables.includes(prop)) {
                        this.logViolation(`Попытка изменения защищённой переменной: ${prop} = ${value}`);
                        this.detectCheat(`Изменение ${prop}`);
                        return false;
                    }
                    target[prop] = value;
                    return true;
                },
                get: (target, prop) => {
                    return target[prop];
                }
            };
            
            window.__GAME_STATE__ = new Proxy({}, handler);
        }
        
        blockCheatMethods() {
            // Блокируем eval
            window.eval = (code) => {
                this.logViolation('Использование eval()');
                this.detectCheat('eval execution');
                return null;
            };
            
            // Блокируем Function constructor
            window.Function = (() => {
                this.logViolation('Использование Function()');
                return () => {};
            });
            
            // Блокируем debugger
            setInterval(() => {
                debugger;
            }, 100);
        }
        
        setupIntegrityCheck() {
            setInterval(() => {
                this.checkIntegrity();
            }, config.integrityCheckInterval);
        }
        
        checkIntegrity() {
            // Проверяем, не изменён ли Canvas
            const canvas = document.getElementById('gameCanvas');
            if (canvas && canvas.toDataURL) {
                const originalToDataURL = canvas.toDataURL;
                canvas.toDataURL = function() {
                    LambdaGuard.instance.logViolation('Попытка чтения canvas');
                    return null;
                };
            }
            
            // Проверяем наличие читерских флагов
            const cheaterFlags = ['cheat', 'hack', 'god', 'infinite', 'trainer', 'engine'];
            for (let key in window) {
                if (cheaterFlags.some(flag => key.toLowerCase().includes(flag))) {
                    this.detectCheat(`Обнаружен читерский объект: ${key}`);
                }
            }
        }
        
        hookGameFunctions() {
            // Перехватываем функции изменения здоровья/счёта
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                if (type === 'keydown' && listener.toString().includes('cheat')) {
                    LambdaGuard.instance.logViolation('Попытка установки читерского обработчика');
                    return;
                }
                return originalAddEventListener.call(this, type, listener, options);
            };
        }
        
        createSafeAPI() {
            return {
                updateScore: (score) => {
                    if (score > 10000) {
                        this.detectCheat('Нереалистичный счёт');
                        return false;
                    }
                    return true;
                },
                updateHealth: (health) => {
                    if (health > 100) {
                        this.detectCheat('Бесконечное здоровье');
                        return false;
                    }
                    return true;
                },
                reportViolation: (msg) => this.logViolation(msg)
            };
        }
        
        detectCheat(reason) {
            this.violations.push({ reason, time: Date.now() });
            console.log("%c🚨 ЧИТ ОБНАРУЖЕН! 🚨", "color: #ff0000; font-size: 14px; font-weight: bold", reason);
            
            if (this.violations.length >= 3) {
                this.punishCheater();
            }
        }
        
        punishCheater() {
            // Наказание для читера
            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
                canvas.style.filter = 'blur(10px)';
                canvas.style.opacity = '0.3';
            }
            
            // Выводим сообщение
            const cheatDiv = document.createElement('div');
            cheatDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: black;
                color: red;
                padding: 20px;
                border: 3px solid red;
                z-index: 9999;
                font-size: 24px;
                text-align: center;
                font-family: monospace;
            `;
            cheatDiv.innerHTML = '🚨 ЧИТ ОБНАРУЖЕН! ИГРА ЗАБЛОКИРОВАНА 🚨<br><small>Не пытайтесь обмануть систему!</small>';
            document.body.appendChild(cheatDiv);
            
            // Останавливаем игровой цикл
            if (window.gameLoop) {
                clearInterval(window.gameLoop);
            }
        }
        
        logViolation(message) {
            this.violations.push(message);
            if (this.violations.length > 50) {
                this.violations.shift();
            }
        }
        
        isDebugMode() {
            return window.location.hash === '#debug';
        }
    }
    
    window.LambdaGuard = new LambdaGuard();
    LambdaGuard.instance = window.LambdaGuard;
})();
