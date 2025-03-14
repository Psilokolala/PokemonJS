// Класс для шума Перлина
class PerlinNoise {
    constructor() {
        this.permutation = new Array(256);
        for (let i = 0; i < 256; i++) {
            this.permutation[i] = i;
        }
        
        // Перемешиваем массив
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
        }
        
        // Дублируем массив для упрощения вычислений
        this.p = [...this.permutation, ...this.permutation];
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y, z = 0) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;

        return this.lerp(w,
            this.lerp(v,
                this.lerp(u,
                    this.grad(this.p[AA], x, y, z),
                    this.grad(this.p[BA], x - 1, y, z)
                ),
                this.lerp(u,
                    this.grad(this.p[AB], x, y - 1, z),
                    this.grad(this.p[BB], x - 1, y - 1, z)
                )
            ),
            this.lerp(v,
                this.lerp(u,
                    this.grad(this.p[AA + 1], x, y, z - 1),
                    this.grad(this.p[BA + 1], x - 1, y, z - 1)
                ),
                this.lerp(u,
                    this.grad(this.p[AB + 1], x, y - 1, z - 1),
                    this.grad(this.p[BB + 1], x - 1, y - 1, z - 1)
                )
            )
        );
    }
}

class Game {
    constructor(initialStars = 0) {
        console.log('Инициализация игры...');
        
        // Создаем canvas и добавляем его в body
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 650; // Увеличиваем высоту на 50 пикселей для текста
        document.body.appendChild(this.canvas);
        
        // Получаем контекст и проверяем его
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Не удалось получить контекст canvas');
            return;
        }
        console.log('Canvas создан и контекст получен');

        // Создаем буферный canvas для анализа пикселей
        this.bufferCanvas = document.createElement('canvas');
        this.bufferCanvas.width = 800;
        this.bufferCanvas.height = 600; // Оставляем оригинальную высоту для карты
        this.bufferCtx = this.bufferCanvas.getContext('2d');

        // Добавляем стили для canvas
        this.canvas.style.border = '1px solid black';
        this.canvas.style.display = 'block';
        this.canvas.style.margin = '0 auto';

        // Загружаем карту
        this.mapImage = new Image();
        this.mapImage.crossOrigin = 'anonymous'; // Добавляем поддержку cross-origin
        this.mapImage.src = 'assets/map.png';
        this.mapLoaded = false;
        this.mapImage.onload = () => {
            console.log('Карта загружена');
            this.mapLoaded = true;
            
            // Настраиваем размеры canvas под размер карты
            this.canvas.width = this.mapImage.width;
            this.canvas.height = this.mapImage.height;
            this.bufferCanvas.width = this.mapImage.width;
            this.bufferCanvas.height = this.mapImage.height;
            
            // Отрисовываем карту в буферный canvas
            this.bufferCtx.drawImage(this.mapImage, 0, 0);
            
            // Пересчитываем биомы под новый размер
            this.biomes = [];
            this.generateSimpleBiomes();

            // Очищаем существующих покемонов перед созданием новых
            this.clearAllPokemons();
            // Создаем новых покемонов только после загрузки карты
            this.createPokemon();
        };
        this.mapImage.onerror = () => {
            console.error('Ошибка загрузки карты');
        };

        this.pokemons = [];
        this.moonStones = [];
        this.loadingCount = 0;
        
        // Добавляем состояние драки покемонов
        this.fightingPokemons = [];
        this.sparkParticles = [];
        this.lastFightTime = 0; // Добавляем время последней драки
        
        // Добавляем метод для удаления всех покемонов
        this.clearAllPokemons = () => {
            this.pokemons = [];
            this.loadingCount = 0;
        };
        
        // Обновляем списки покемонов по типам
        this.flyingTypes = [
            'Charizard 🔥',
            'Dragonite 🐉',
            'Rayquaza 🐉',
            'Salamence 🔥'
        ];

        this.waterTypes = [
            'Squirtle 💧',
            'Gyarados 🌊',
            'Blastoise 💦',
            'Greninja 🐸'
        ];

        this.landTypes = [
            'Pikachu ⚡️',
            'Bulbasaur 🌿',
            'Eevee ✨',
            'Mewtwo 🧠',
            'Lucario 🥋',
            'Gengar 👻',
            'Snorlax 😴',
            'Arcanine 🔥',
            'Jigglypuff 🎤',
            'Machamp 💪',
            'Venusaur 🍃',
            'Alakazam 🔮',
            'Gardevoir 💖',
            'Tyranitar 🏔',
            'Zoroark 🦊',
            'Sylveon 🎀',
            'Infernape 🔥🐵',
            'Metagross 🛡',
            'Darkrai 🌑',
            'Cyndaquil 🔥',
            'Chandelure 🕯',
            'Umbreon 🌙'
        ];

        // Объединяем все типы в один список
        this.allPokemon = [...this.flyingTypes, ...this.waterTypes, ...this.landTypes];

        // Обновляем определение типа местности
        this.terrainTypes = {
            WATER: 'water',
            LAND: 'land',
            OUT_OF_BOUNDS: 'out'
        };

        // Добавляем счетчик для анимаций
        this.animationFrame = 0;

        // Добавляем шум Перлина
        this.noise = new PerlinNoise();

        // Создаем биомы (упрощенная версия для карты)
        this.biomes = [];
        this.biomeSize = 32;
        this.generateSimpleBiomes();
        console.log('Биомы созданы:', this.biomes.length);

        // Показываем экран загрузки
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
            console.log('Экран загрузки отображен');
        }

        // Создаем лунные камни
        console.log('Создание лунных камней...');
        for (let i = 0; i < 5; i++) {
            this.moonStones.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                collected: false
            });
        }

        // Добавляем переменные для управления сообщениями
        this.currentMessage = null;
        this.messageTimer = null;
        this.messageDisplayTime = 2000; // 2 секунды
        this.messageInterval = Math.floor(Math.random() * 3000) + 7000; // Случайное время от 7 до 10 секунд
        this.lastMessagePokemon = null;
        this.lastMessageTime = 0;

        // Запускаем систему сообщений
        this.startMessageSystem();

        // Добавляем массив сообщений покемонов при клике
        this.pokemonClickMessages = [
            "Ой, щекотно!",
            "Ты опять? Я не устал!",
            "Есть что-нибудь вкусненькое?",
            "Ты что, меня разбудил?",
            "Я красивый, да?",
            "Хватит меня дергать!",
            "Дай хвостик почесать!",
            "Ты мне нравишься!",
            "Я только что пообедал, не трогай меня!",
            "Не трогай меня, я тут размышляю!",
            "Ты знаешь, что я самый лучший?",
            "Ну давай, удиви меня!",
            "Не шутки, а реально смешно!",
            "У меня тут встреча, подожди немного.",
            "Ты когда-нибудь пробовал зелье спокойствия?",
            "Знаешь, я могу стать невидимым… почти!",
            "Я не просто красивый, я ещё и умный!",
            "Хочу спать… но ладно, давай!",
            "Нажми ещё раз, мне нравится!",
            "Я тут как-то просто отдыхаю.",
            "Ничего не жду… или всё-таки жду?",
            "Можно не дергать меня каждый раз?",
            "Ладно-ладно, что тебе нужно?",
            "Сколько раз можно меня щекотать?",
            "Дай мне пару минут, мне нужно подумать.",
            "Я вообще-то занят, но давай поговорим!",
            "Не стоит меня будить, я люблю спать.",
            "Ты меня не утомил ещё?",
            "Что, опять я? Ну ладно.",
            "Я просто наслаждаюсь жизнью, понял?",
            "Не зли меня, я могу быть смешным!",
            "Ты думаешь, я не могу бегать быстро?",
            "Хочешь, я расскажу шутку?",
            "Ты правда веришь, что я могу прыгнуть?",
            "У тебя есть секреты? Я люблю секреты!",
            "Может, просто посидим и помолчим?",
            "Слушай, я так устал… или нет?",
            "Не жми меня так часто, я же не кнопка!",
            "Могу стать твоим лучшим другом, но ты должен заслужить это!",
            "Ты не против, если я немного побуду ленивым?",
            "О, привет, ты всё ещё здесь?",
            "Ты когда-нибудь думал, что я могу танцевать?",
            "Я умею читать мысли! Но только иногда.",
            "Мне так нравится, когда ты меня трогаешь!",
            "Ну как тебе? Я потрясающий?",
            "Ты же не будешь меня сейчас беспокоить, да?",
            "Что будем делать? Спать или веселиться?",
            "Ты так часто меня нажимаешь, что я уже привык!",
            "Я не просто покемон, я — сенсация!",
            "Мне кажется, ты меня обожаешь!",
            "У меня есть идея, но она странная!",
            "Ты вообще понимаешь, что я — звезда?",
            "Я же не игрушка! Хотя… почти!",
            "Ты на меня не обижен, правда?",
            "Как тебе мои ушки? Классные?",
            "Ладно, я тебе прощаюсь. Пойду спать!",
            "Я в отпуске, но можно ещё немного поиграть!"
        ];

        // Добавляем обработчики кликов по кнопкам
        this.canvas.addEventListener('click', (event) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Проверяем клик по кнопкам
            if (this.isClickOnNFTButton(x, y)) {
                window.open('https://getgems.io/collection/EQDtXpkmwbKk8HoRSEcmwo1EY5dyDns1MgucjHOgCn-ydfVX', '_blank');
                return;
            }
            if (this.isClickOnTelegramButton(x, y)) {
                window.open('https://t.me/aipokemons', '_blank');
                return;
            }

            // Существующий код обработки кликов по покемонам
            this.pokemons.forEach(pokemon => {
                const dx = x - pokemon.x;
                const dy = y - pokemon.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < pokemon.size / 2) {
                    // Добавляем вибрацию при клике на покемона
                    if (navigator.vibrate) {
                        navigator.vibrate(50); // 50мс вибрации
                    }

                    // Выбираем случайное сообщение для клика
                    const randomMessage = this.pokemonClickMessages[
                        Math.floor(Math.random() * this.pokemonClickMessages.length)
                    ];

                    // Очищаем предыдущий таймер
                    if (this.messageTimer) {
                        clearTimeout(this.messageTimer);
                    }

                    // Показываем сообщение
                    this.currentMessage = {
                        pokemon: pokemon,
                        text: randomMessage,
                        timeLeft: this.messageDisplayTime
                    };

                    // Устанавливаем таймер для скрытия сообщения
                    this.messageTimer = setTimeout(() => {
                        this.currentMessage = null;
                    }, this.messageDisplayTime);
                }
            });
        });

        // Обновляем координаты деревьев и их размеры
        this.trees = [
            { x: 140, y: 120, radius: 25, height: 90 },  // Левая пальма
            { x: 290, y: 120, radius: 25, height: 90 },  // Центральная пальма
            { x: 460, y: 100, radius: 25, height: 90 }   // Правая пальма
        ];

        // Добавляем цвета для искр
        this.sparkColors = [
            'rgba(255, 255, 0', // желтый
            'rgba(255, 0, 0',   // красный
            'rgba(0, 255, 255', // голубой
            'rgba(255, 0, 255', // розовый
            'rgba(0, 255, 0'    // зеленый
        ];

        // Добавляем массив боевых фраз
        this.pokemonBattleQuotes = [
            "Сейчас палец откушу!",
            "Ты сам напросился!",
            "Лови плюху!",
            "Ой, это я случайно...",
            "Ну всё, держись!",
            "Где кнопка «сдаться»?",
            "Ты что, бессмертный?",
            "Бей сильнее, не чувствую!",
            "Я тут чисто ради опыта!",
            "Давай быстрее, у меня обед!",
            "Не зли меня!",
            "Ты двигаешься или у меня лаги?",
            "Эй, судья, он читер!",
            "Я ещё не в финальной форме!",
            "Можно я ударю морально?",
            "Ой, сам себя ударил...",
            "Кажется, я это видел в аниме!",
            "Вот бы хилку сейчас...",
            "Ты серьёзно? Это был удар?",
            "Не могу проиграть, у меня свиданка!",
            "Бой бой, а чай пить будем?",
            "Хочешь, я поддамся? Шутка!",
            "Воу, мне понравилось, давай ещё!",
            "Какой урон?! У меня шкура дубовая!",
            "Я вызываю рефери!",
            "Ай, это было больно...",
            "Ты силён, но я ленив!",
            "Мне бы левелап...",
            "Это я тебя или ты меня ударил?",
            "А можно без ответки?",
            "Ну всё, включаю серьёзный режим!",
            "А может, не будем драться?",
            "Сдавайся, пока не поздно!",
            "Я в порядке, просто лежу...",
            "Ты что, босс?",
            "А как отменить ход?",
            "Твоя атака — это всё?",
            "Я даже не почувствовал!",
            "Ой, что-то хп быстро падает...",
            "Ты что, хильнулся?!",
            "Я уже жалею, что начал...",
            "Удар был неплох, но я лучше!",
            "Я просто разогреваюсь!",
            "Ты готов к комбо-удару?",
            "Хватит, у меня лапки!",
            "Как насчёт ничьей?",
            "Может, просто обнимемся?",
            "Ого, ты реально силён!",
            "Я всё ещё стою? Неплохо!",
            "Ну всё, держись, финальный удар!",
            "Ты точно уверен, что хочешь продолжать?",
            "Ну ты прям как ураган!",
            "Ты как мне с этим справиться?",
            "Ты же не думал, что я сдамся?",
            "Хватит уже, я устал от твоих атак!",
            "Ну, что, снова сыграем в камень-ножницы-бумага?",
            "Вот так, а теперь мой ход!",
            "Я что-то почувствовал, как ударил!",
            "Я тебе потом всё объясню, но после победы!",
            "Кажется, мне нужно перезарядиться...",
            "Сейчас я выведу новую тактику!",
            "Ты меня запарил, но ничего, я всё равно выиграю!",
            "Ты не знаешь, с кем связался!",
            "Я буду сражаться до конца, но ты меня не победишь!",
            "Не сдавайся, я всё равно тебя одолею!",
            "Не нервничай, я же не победил ещё!",
            "А что, так можно было?",
            "Я тебя предупредил, но ты всё равно нажал!",
            "А может, возьмём паузу и выпьём воды?",
            "Ты меня обижаешь, но я всё равно выиграю!",
            "Может, просто сдадимся и станем друзьями?",
            "Ты уверен, что хочешь продолжить? Я серьёзно настроен!",
            "Сейчас покажу тебе свои суперспособности!",
            "Так, время для решающего удара!",
            "Ты реально думаешь, что это меня остановит?",
            "Я столько раз побеждал, что уже скучно!",
            "Кажется, ты не до конца понял, кто тут главный!",
            "Я, конечно, не супергерой, но побеждать умею!"
        ];

        // Добавляем цитаты про Telegram Premium
        this.telegramQuotes = [
            "Дуров, подари премиум!",
            "ИИ сказал, мне нужен премиум!",
            "Жду подарок от Telegram!",
            "Премиум — билет в элиту!",
            "Где мои звёзды, Дуров?",
            "ИИ обещал мне подписку!",
            "Бесплатная версия? Не, не слышал!",
            "Я не премиум, но мысленно там!",
            "Кажется, я родился без звёзд!",
            "Премиум — мой смысл жизни!",
            "Дуров, дай сил… и подписку!",
            "Без премиума даже стикеры грустные!",
            "ИИ сказал, что я не VIP…",
            "Пойду копить на Telegram Premium!",
            "Может, мне просто подарят звезду?",
            "Завтра куплю премиум… может быть!",
            "ИИ думает, что я богат… на эмоции!",
            "Может, премиум добавит мне ума?",
            "Дуров, усынови меня!",
            "Куплю Telegram Premium, когда разбогатею!",
            "Премиум — это как любовь, доступен не всем!",
            "Премиум — мой пропуск в высший свет!",
            "Каждый день проверяю: вдруг Дуров сделал меня элитой!",
            "Если не куплю премиум, уйду в ICQ!",
            "ИИ сказал, что я обычный… Премиум исправит!",
            "Бесплатный Telegram – для простых смертных!",
            "Я верю в чудо… и в подарок от Telegram!",
            "Хочу премиум, но кошелёк против!",
            "ИИ предсказал мне подписку… ждём!",
            "Премиум – это золото в мире Telegram!",
            "Если куплю премиум, стану умнее?",
            "Когда у меня будет подписка, жизнь заиграет красками!",
            "С премиумом даже боты начинают уважать!",
            "Дуров, сделай вид, что я особенный!",
            "Каждую ночь мечтаю о Telegram Premium!",
            "Без звёзд чувствую себя ничтожеством!",
            "Премиум – это как спортзал: все хотят, но не все берут!",
            "ИИ сказал, что я слишком обычный…",
            "Я премиум в душе!",
            "Когда-нибудь Дуров меня заметит!",
            "Без премиума жизнь кажется серой!",
            "Telegram без премиума – как кофе без кофеина!",
            "Завтра точно куплю премиум… может быть!",
            "Моя цель – стать элитой Telegram!",
            "Зачем мне машина, если есть премиум?",
            "Если куплю подписку, стану богаче?",
            "Иногда мне кажется, что Telegram издевается!",
            "Дуров, сделай скидку, я хороший!",
            "Хочу премиум, но жаба душит!",
            "Когда-нибудь я получу этот значок!",
            "Куплю подписку и буду смотреть на всех свысока!"
        ];

        // Добавляем систему погоды
        this.weather = {
            current: 'clear',
            particles: [],
            nextChangeTime: Date.now() + this.getRandomInterval(20000, 40000), // Следующая смена погоды через 20-40 секунд
            possibleTypes: ['clear', 'rain', 'snow', 'wind']
        };

        // Параметры для частиц
        this.maxParticles = 100;
        this.windForce = 0;
        this.windAngle = 0;

        // Запускаем анимацию
        console.log('Запуск анимации...');
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        // Добавляем массив звезд и коробку
        this.stars = [];
        this.starBox = {
            x: 50,
            y: this.canvas ? this.canvas.height - 100 : 500,
            width: 80,
            height: 80,
            collectedStars: 0
        };
        
        // Добавляем интервал создания новых звезд
        this.lastStarSpawnTime = 0;
        this.starSpawnInterval = 5000; // Каждые 5 секунд

        // Создаем начальные звезды (треть от количества покемонов)
        this.maxStars = Math.floor(30 / 3); // 30 - общее количество покемонов
        for (let i = 0; i < this.maxStars; i++) {
            this.createStar();
        }

        // Устанавливаем начальное количество звезд
        this.starBox.collectedStars = initialStars;

        // Добавляем параметры для иконки погоды
        this.weatherIcon = {
            x: 60,  // Перемещаем в левый край
            y: 60,  // Отступ сверху
            size: 80  // Уменьшаем размер
        };
    }

    generateSimpleBiomes() {
        // Создаем упрощенную карту биомов на основе изображения
        const beachY = this.canvas.height * 0.3; // Примерная граница пляжа
        
        for (let y = 0; y < this.canvas.height; y += this.biomeSize) {
            for (let x = 0; x < this.canvas.width; x += this.biomeSize) {
                let biomeType;
                if (y < beachY) {
                    biomeType = 'forest'; // Зона с пальмами
                } else {
                    biomeType = 'sand'; // Пляжная зона
                }
                
                const biome = {
                    x: x,
                    y: y,
                    width: this.biomeSize,
                    height: this.biomeSize,
                    name: biomeType
                };
                
                // Устанавливаем цвет и границу для биома (теперь они будут прозрачными)
                switch(biome.name) {
                    case 'forest':
                        biome.color = 'rgba(46, 139, 87, 0)';
                        biome.borderColor = 'rgba(27, 77, 46, 0)';
                        break;
                    case 'sand':
                        biome.color = 'rgba(222, 184, 135, 0)';
                        biome.borderColor = 'rgba(184, 134, 11, 0)';
                        break;
                }
                
                this.biomes.push(biome);
            }
        }
    }

    // Обновляем метод определения воды
    isWater(x, y) {
        if (!this.mapLoaded || x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
            return false;
        }
        
        // Если точка находится выше пальм (примерно 30% высоты карты), это вода
        return y < this.canvas.height * 0.3;
    }

    // Добавляем метод определения суши
    isLand(x, y) {
        if (!this.mapLoaded || x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
            return false;
        }

        // Всё, что не вода - это суша
        return y >= this.canvas.height * 0.3;
    }

    // Обновляем метод определения типа местности
    getTerrainType(x, y) {
        if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
            return this.terrainTypes.OUT_OF_BOUNDS;
        }

        // Для летающих покемонов всегда возвращаем доступную местность
        if (this.pokemons.some(p => p.x === x && p.y === y && p.isFlying)) {
            return this.terrainTypes.LAND;
        }

        // Проверяем тип местности
        if (this.isWater(x, y)) {
            return this.terrainTypes.WATER;
        }
        
        return this.terrainTypes.LAND;
    }

    // Обновляем создание покемонов
    createPokemon() {
        console.log('Создание покемонов...');
        let attempts = 0;
        const maxAttempts = 1000;
        const usedPokemon = new Set();
        const shuffledPokemon = [...this.allPokemon].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < 30; i++) {
            let x, y, species;
            let validPosition = false;
            attempts = 0;

            while (!validPosition && attempts < maxAttempts) {
                x = Math.random() * this.canvas.width;
                y = Math.random() * this.canvas.height;
                
                const terrainType = this.getTerrainType(x, y);
                const availablePokemon = shuffledPokemon.filter(p => !usedPokemon.has(p));
                
                if (availablePokemon.length === 0) break;

                // Выбираем покемона в зависимости от местности
                if (terrainType === this.terrainTypes.WATER) {
                    species = availablePokemon.find(p => 
                        this.waterTypes.includes(p) || this.flyingTypes.includes(p)
                    );
                } else if (terrainType === this.terrainTypes.LAND) {
                    species = availablePokemon.find(p => 
                        !this.waterTypes.includes(p) || this.flyingTypes.includes(p)
                    );
                }

                // Если не нашли подходящего покемона, пробуем взять летающего
                if (!species && this.flyingTypes.some(p => availablePokemon.includes(p))) {
                    species = availablePokemon.find(p => this.flyingTypes.includes(p));
                }

                // Если все еще нет покемона, берем любого доступного
                if (!species) {
                    species = availablePokemon[0];
                }
                
                if (species) {
                    // Проверяем, что позиция подходит для типа покемона
                    const isFlying = this.flyingTypes.includes(species);
                    const isWater = this.waterTypes.includes(species);
                    
                    if (isFlying || 
                        (isWater && terrainType === this.terrainTypes.WATER) ||
                        (!isWater && terrainType === this.terrainTypes.LAND)) {
                        usedPokemon.add(species);
                        validPosition = true;
                    }
                }
                
                attempts++;
            }

            if (attempts >= maxAttempts || !species) {
                console.warn(`Не удалось найти подходящую позицию для покемона ${i + 1}`);
                continue;
            }

            console.log(`Создание покемона ${i + 1}: ${species} в позиции (${Math.floor(x)}, ${Math.floor(y)})`);
            const pokemon = new Pokemon(x, y, species);
            pokemon.isFlying = this.flyingTypes.includes(species);
            pokemon.isWater = this.waterTypes.includes(species);
            this.pokemons.push(pokemon);
            this.loadingCount++;
        }
    }

    animate() {
        // Увеличиваем счетчик анимации
        this.animationFrame++;
        
        // Очищаем canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Отрисовываем карту как фон
        if (this.mapLoaded) {
            this.ctx.drawImage(this.mapImage, 0, 0);
            
            // Обновляем буферный canvas, если нужно
            if (this.bufferCtx.canvas.width !== this.canvas.width || 
                this.bufferCtx.canvas.height !== this.canvas.height) {
                this.bufferCanvas.width = this.canvas.width;
                this.bufferCanvas.height = this.canvas.height;
                this.bufferCtx.drawImage(this.mapImage, 0, 0);
            }

            // Отмечаем деревья (теперь невидимые, но функциональные)
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0)'; // Делаем заливку полностью прозрачной
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0)'; // Делаем обводку полностью прозрачной
            this.trees.forEach(tree => {
                this.ctx.beginPath();
                this.ctx.moveTo(tree.x, tree.y - tree.height);
                this.ctx.lineTo(tree.x - tree.radius, tree.y + tree.radius);
                this.ctx.lineTo(tree.x + tree.radius, tree.y + tree.radius);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
            });
            this.ctx.restore();
        }

        // Отрисовка биомов (теперь они прозрачные, так как используем карту)
        this.biomes.forEach(biome => {
            // Добавляем только интерактивные элементы
            switch(biome.name) {
                case 'forest':
                    // Можно добавить анимацию листьев пальм
                    break;
                case 'sand':
                    // Можно добавить лёгкую анимацию песка
                    this.drawSandTexture(biome);
                    break;
            }
        });

        // Отрисовка лунных камней
        this.moonStones.forEach(stone => {
            if (!stone.collected) {
                this.ctx.fillStyle = '#8888ff';
                this.ctx.beginPath();
                this.ctx.arc(stone.x, stone.y, 8, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Добавляем свечение
                const gradient = this.ctx.createRadialGradient(
                    stone.x, stone.y, 0,
                    stone.x, stone.y, 20
                );
                gradient.addColorStop(0, 'rgba(136, 136, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(136, 136, 255, 0)');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(stone.x, stone.y, 20, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        // Проверяем столкновения покемонов и создаем драки
        this.pokemons.forEach((pokemon1, index1) => {
            this.pokemons.forEach((pokemon2, index2) => {
                if (index1 < index2) { // Проверяем каждую пару только один раз
                    const dx = pokemon1.x - pokemon2.x;
                    const dy = pokemon1.y - pokemon2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Если покемоны достаточно близко и не дерутся
                    if (distance < pokemon1.size && 
                        !this.fightingPokemons.some(fight => 
                            fight.pokemon1 === pokemon1 || 
                            fight.pokemon1 === pokemon2 || 
                            fight.pokemon2 === pokemon1 || 
                            fight.pokemon2 === pokemon2
                        ) &&
                        Date.now() - this.lastFightTime >= 30000) { // Проверяем, прошло ли 30 секунд с последней драки
                        
                        // Обновляем время последней драки
                        this.lastFightTime = Date.now();
                        
                        // Добавляем случайную вероятность (40%) для выкриков во время драки
                        const shouldYell = Math.random() < 0.4;
                        
                        // Случайно выбираем, какой покемон будет говорить
                        const speakingPokemon = Math.random() < 0.5 ? pokemon1 : pokemon2;
                        
                        // Получаем имена покемонов без эмодзи
                        const pokemon1Name = pokemon1.species.split(' ')[0];
                        const pokemon2Name = pokemon2.species.split(' ')[0];
                        
                        // Вычисляем среднюю точку между покемонами
                        const centerX = (pokemon1.x + pokemon2.x) / 2;
                        const centerY = (pokemon1.y + pokemon2.y) / 2;
                        
                        // Устанавливаем покемонов близко друг к другу
                        const fightDistance = pokemon1.size * 0.3; // Уменьшаем расстояние между покемонами
                        const angle = Math.atan2(pokemon2.y - pokemon1.y, pokemon2.x - pokemon1.x);
                        
                        this.fightingPokemons.push({
                            pokemon1: pokemon1,
                            pokemon2: pokemon2,
                            startTime: Date.now(),
                            shouldYell: shouldYell,
                            speakingPokemon: speakingPokemon,
                            lastYellTime: 0,
                            originalPositions: {
                                x1: pokemon1.x,
                                y1: pokemon1.y,
                                x2: pokemon2.x,
                                y2: pokemon2.y
                            },
                            fightPositions: {
                                x1: centerX - Math.cos(angle) * fightDistance / 2,
                                y1: centerY - Math.sin(angle) * fightDistance / 2,
                                x2: centerX + Math.cos(angle) * fightDistance / 2,
                                y2: centerY + Math.sin(angle) * fightDistance / 2
                            }
                        });

                        // Создаем начальные искры с разными цветами
                        for (let i = 0; i < 10; i++) {
                            const color = this.sparkColors[Math.floor(Math.random() * this.sparkColors.length)];
                            this.sparkParticles.push({
                                x: (pokemon1.x + pokemon2.x) / 2,
                                y: (pokemon1.y + pokemon2.y) / 2,
                                vx: (Math.random() - 0.5) * 5,
                                vy: (Math.random() - 0.5) * 5,
                                life: 1.0,
                                color: color
                            });
                        }
                    }
                }
            });
        });

        // Обновляем и отрисовываем драки
        this.fightingPokemons = this.fightingPokemons.filter(fight => {
            const elapsed = Date.now() - fight.startTime;
            
            if (elapsed < 3000) { // Драка длится 3 секунды
                // Если покемоны должны кричать и прошло достаточно времени с последнего крика
                if (fight.shouldYell && Date.now() - fight.lastYellTime > 1000) {
                    // Выбираем случайную фразу
                    const randomQuote = this.pokemonBattleQuotes[
                        Math.floor(Math.random() * this.pokemonBattleQuotes.length)
                    ];
                    
                    // Создаем сообщение для выбранного покемона
                    this.currentMessage = {
                        pokemon: fight.speakingPokemon,
                        text: randomQuote,
                        timeLeft: 1000
                    };
                    
                    // Устанавливаем таймер для скрытия сообщения
                    setTimeout(() => {
                        if (this.currentMessage && this.currentMessage.pokemon === fight.speakingPokemon) {
                            this.currentMessage = null;
                        }
                    }, 1000);
                    
                    fight.lastYellTime = Date.now();
                }
                
                // Добавляем дёрганье вокруг позиции драки
                const shake = Math.sin(elapsed * 0.1) * 3;
                fight.pokemon1.x = fight.fightPositions.x1 + shake;
                fight.pokemon2.x = fight.fightPositions.x2 - shake;
                
                // Предотвращаем движение покемонов во время драки
                fight.pokemon1.isInFight = true;
                fight.pokemon2.isInFight = true;

                // Создаем новые искры
                if (Math.random() < 0.3) {
                    const color = this.sparkColors[Math.floor(Math.random() * this.sparkColors.length)];
                    this.sparkParticles.push({
                        x: (fight.pokemon1.x + fight.pokemon2.x) / 2,
                        y: (fight.pokemon1.y + fight.pokemon2.y) / 2,
                        vx: (Math.random() - 0.5) * 5,
                        vy: (Math.random() - 0.5) * 5,
                        life: 1.0,
                        color: color
                    });
                }

                // Проверяем, есть ли у кого-то из дерущихся звезда
                this.stars.forEach(star => {
                    if (star.carriedBy === fight.pokemon1 || star.carriedBy === fight.pokemon2) {
                        // 30% шанс отобрать звезду
                        if (Math.random() < 0.3) {
                            // Определяем, кто несет звезду и кто может её отобрать
                            const currentCarrier = star.carriedBy;
                            const newCarrier = currentCarrier === fight.pokemon1 ? fight.pokemon2 : fight.pokemon1;
                            
                            // Меняем владельца звезды
                            star.carriedBy = newCarrier;
                        }
                    }
                });
                
                return true;
            } else {
                // Возвращаем покемонов на их исходные позиции
                fight.pokemon1.x = fight.originalPositions.x1;
                fight.pokemon1.y = fight.originalPositions.y1;
                fight.pokemon2.x = fight.originalPositions.x2;
                fight.pokemon2.y = fight.originalPositions.y2;
                
                // Разрешаем покемонам снова двигаться
                fight.pokemon1.isInFight = false;
                fight.pokemon2.isInFight = false;
                return false;
            }
        });

        // Обновляем и отрисовываем искры
        this.sparkParticles = this.sparkParticles.filter(spark => {
            spark.x += spark.vx;
            spark.y += spark.vy;
            spark.life -= 0.05;

            if (spark.life > 0) {
                this.ctx.beginPath();
                this.ctx.fillStyle = `${spark.color}, ${spark.life})`;
                this.ctx.arc(spark.x, spark.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
                return true;
            }
            return false;
        });

        // Отрисовка покемонов
        this.pokemons.forEach(pokemon => {
            pokemon.update(this.pokemons, this.moonStones, this.biomes);
            
            // Проверяем, находится ли покемон под деревом
            let isUnderTree = false;
            for (const tree of this.trees) {
                // Проверка попадания точки в треугольник
                const px = pokemon.x;
                const py = pokemon.y;
                
                // Координаты вершин треугольника
                const x1 = tree.x; // Вершина
                const y1 = tree.y - tree.radius;
                const x2 = tree.x - tree.radius; // Левый нижний угол
                const y2 = tree.y + tree.radius;
                const x3 = tree.x + tree.radius; // Правый нижний угол
                const y3 = tree.y + tree.radius;
                
                // Функция для определения знака
                const sign = (x1, y1, x2, y2, x3, y3) => {
                    return (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
                }
                
                // Проверяем, находится ли точка внутри треугольника
                const d1 = sign(px, py, x1, y1, x2, y2);
                const d2 = sign(px, py, x2, y2, x3, y3);
                const d3 = sign(px, py, x3, y3, x1, y1);
                
                const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
                const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
                
                isUnderTree = !(hasNeg && hasPos);
                
                if (isUnderTree) break;
            }
            
            // Отрисовка спрайта с учетом прозрачности
            if (pokemon.spriteLoaded) {
                this.ctx.save();
                if (isUnderTree) {
                    this.ctx.globalAlpha = 0.5; // Делаем покемона полупрозрачным под деревом
                }
                this.ctx.drawImage(
                    pokemon.sprite,
                    pokemon.x - pokemon.size/2,
                    pokemon.y - pokemon.size/2,
                    pokemon.size,
                    pokemon.size
                );
                this.ctx.restore();
            }
        });

        // Проверяем, все ли спрайты загружены
        if (this.loadingCount > 0) {
            this.loadingCount = this.pokemons.filter(p => !p.spriteLoaded).length;
            if (this.loadingCount === 0) {
                const loadingElement = document.getElementById('loading');
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            }
        }

        // Добавляем заголовок "AI Pokemons" перед отрисовкой сообщений покемонов
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillStyle = '#FFD700'; // Золотой цвет
        this.ctx.font = 'bold 36px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Добавляем обводку текста
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText('AI Pokemons', this.canvas.width / 2, 40);
        
        // Рисуем сам текст
        this.ctx.fillText('AI Pokemons', this.canvas.width / 2, 40);
        
        this.ctx.restore();

        // Отрисовка сообщения покемона
        if (this.currentMessage) {
            const pokemon = this.currentMessage.pokemon;
            const text = this.currentMessage.text;
            
            // Рисуем облако сообщения
            this.ctx.save();
            this.ctx.fillStyle = 'white';
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.lineWidth = 2;
            
            // Измеряем текст с обычным жирным шрифтом
            this.ctx.font = 'bold 14px Arial';
            const metrics = this.ctx.measureText(text);
            const padding = 8;
            const bubbleWidth = metrics.width + padding * 2;
            const bubbleHeight = 25;
            
            // Находим позицию для текста без тряски
            let textX = pokemon.x;
            let textY = pokemon.y;
            
            // Если покемон в драке, используем его позицию до тряски
            const fight = this.fightingPokemons.find(f => 
                f.pokemon1 === pokemon || f.pokemon2 === pokemon
            );
            
            if (fight) {
                if (fight.pokemon1 === pokemon) {
                    textX = fight.fightPositions.x1;
                    textY = fight.fightPositions.y1;
                } else {
                    textX = fight.fightPositions.x2;
                    textY = fight.fightPositions.y2;
                }
            }
            
            // Рисуем облако с закругленными углами
            // Проверяем и корректируем позицию облака, чтобы оно не выходило за границы
            let bubbleX = textX - bubbleWidth/2;
            let bubbleY = textY - 40; // Поднимаем облако над покемоном
            
            // Корректируем позицию по X
            if (bubbleX < 0) {
                bubbleX = 0;
            } else if (bubbleX + bubbleWidth > this.canvas.width) {
                bubbleX = this.canvas.width - bubbleWidth;
            }
            
            this.ctx.beginPath();
            this.roundRect(
                bubbleX,
                bubbleY,
                bubbleWidth,
                bubbleHeight,
                10
            );
            this.ctx.fill();
            this.ctx.stroke();
            
            // Рисуем текст с учетом скорректированной позиции
            this.ctx.fillStyle = 'black';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText(
                text,
                bubbleX + bubbleWidth/2,
                bubbleY + bubbleHeight/2
            );
            
            this.ctx.restore();
        }

        // Добавляем подсказку в белом окне
        this.ctx.save();
        
        // Создаем градиент для фона
        const gradient = this.ctx.createLinearGradient(
            this.canvas.width / 2 - 150, this.canvas.height - 30,
            this.canvas.width / 2 + 150, this.canvas.height - 30
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
        
        // Рисуем фон с тенью
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // Рисуем закругленный прямоугольник
        this.roundRect(
            this.canvas.width / 2 - 150,
            this.canvas.height - 40,
            300,
            30,
            15
        );
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Добавляем обводку
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Рисуем звездочки
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⭐', this.canvas.width / 2 - 130, this.canvas.height - 25);
        this.ctx.fillText('⭐', this.canvas.width / 2 + 130, this.canvas.height - 25);
        
        // Рисуем текст подсказки
        this.ctx.fillStyle = '#000000';
        this.ctx.font = 'normal 12px "Press Start 2P"';
        this.ctx.fillText('Нажми на покемона', this.canvas.width / 2, this.canvas.height - 25);
        
        this.ctx.restore();

        // Спавн новых звезд (только если их меньше максимума)
        if (Date.now() - this.lastStarSpawnTime > this.starSpawnInterval && 
            this.stars.length < this.maxStars) {
            this.createStar();
            this.lastStarSpawnTime = Date.now();
        }

        // Отрисовка звезд
        this.stars.forEach(star => {
            if (!star.collected) {
                // Рисуем звезду
                this.ctx.save();
                this.ctx.translate(star.x, star.y);
                this.ctx.rotate(star.rotation);
                
                this.ctx.beginPath();
                this.ctx.fillStyle = 'gold';
                
                // Рисуем пятиконечную звезду
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI) / 5;
                    const x = Math.cos(angle) * star.size;
                    const y = Math.sin(angle) * star.size;
                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();

                // Добавляем вращение
                star.rotation += 0.02;
            } else if (star.carriedBy) {
                // Если звезда собрана и несется покемоном
                const offsetX = star.carriedBy.x + star.carriedBy.size/4;
                const offsetY = star.carriedBy.y - star.carriedBy.size/4;
                
                // Рисуем звезду
                this.ctx.save();
                this.ctx.translate(offsetX, offsetY);
                this.ctx.rotate(star.rotation);
                
                this.ctx.beginPath();
                this.ctx.fillStyle = 'gold';
                this.ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
                this.ctx.shadowBlur = 10;
                
                // Рисуем пятиконечную звезду
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI) / 5;
                    const x = Math.cos(angle) * star.size;
                    const y = Math.sin(angle) * star.size;
                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();

                // Обновляем позицию звезды для проверки столкновений
                star.x = offsetX;
                star.y = offsetY;
                
                // Добавляем вращение
                star.rotation += 0.05;
            }
        });

        // Отрисовка коробки для звезд
        this.ctx.save();
        this.ctx.fillStyle = '#8B4513';
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 3;
        
        // Рисуем коробку
        this.roundRect(
            this.starBox.x,
            this.starBox.y,
            this.starBox.width,
            this.starBox.height,
            10
        );
        this.ctx.fill();
        this.ctx.stroke();

        // Добавляем текст с количеством собранных звезд
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            `⭐ ${this.starBox.collectedStars}`,
            this.starBox.x + this.starBox.width/2,
            this.starBox.y + this.starBox.height/2 + 7
        );
        this.ctx.restore();

        // Проверяем сбор звезд покемонами
        this.pokemons.forEach(pokemon => {
            // Проверяем столкновение с несобранными звездами
            this.stars.forEach(star => {
                if (!star.collected && !star.carriedBy) {
                    const dx = pokemon.x - star.x;
                    const dy = pokemon.y - star.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < pokemon.size/2 + star.size/2) {
                        star.collected = true;
                        star.carriedBy = pokemon;
                        
                        // Показываем случайную цитату про Telegram Premium при сборе звезды
                        const randomQuote = this.telegramQuotes[
                            Math.floor(Math.random() * this.telegramQuotes.length)
                        ];
                        
                        this.currentMessage = {
                            pokemon: pokemon,
                            text: randomQuote,
                            timeLeft: this.messageDisplayTime
                        };

                        // Очищаем предыдущий таймер
                        if (this.messageTimer) {
                            clearTimeout(this.messageTimer);
                        }

                        // Устанавливаем таймер для скрытия сообщения
                        this.messageTimer = setTimeout(() => {
                            this.currentMessage = null;
                        }, this.messageDisplayTime);
                    }
                }
            });

            // Проверяем, не несет ли покемон звезду к коробке
            this.stars.forEach(star => {
                if (star.carriedBy === pokemon) {
                    const dx = pokemon.x - (this.starBox.x + this.starBox.width/2);
                    const dy = pokemon.y - (this.starBox.y + this.starBox.height/2);
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < this.starBox.width/2) {
                        // Звезда доставлена в коробку
                        this.starBox.collectedStars++;
                        // Удаляем звезду из массива
                        this.stars = this.stars.filter(s => s !== star);
                    }
                }
            });
        });

        // Добавляем обновление погоды перед отрисовкой покемонов
        this.updateWeather();

        // Добавляем отрисовку иконки погоды в самом конце, после всех остальных элементов
        this.drawWeatherIcon();

        // Добавляем отрисовку кнопок перед завершением анимации
        this.drawButtons();

        requestAnimationFrame(this.animate);
    }

    drawSandTexture(biome) {
        // Добавляем лёгкую анимацию песка
        this.ctx.strokeStyle = 'rgba(184, 134, 11, 0.1)';
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(biome.x, biome.y + biome.height * 0.5);
            this.ctx.bezierCurveTo(
                biome.x + biome.width * 0.3, 
                biome.y + biome.height * 0.4 + Math.sin(this.animationFrame * 0.02 + i) * 2,
                biome.x + biome.width * 0.7, 
                biome.y + biome.height * 0.6 + Math.sin(this.animationFrame * 0.02 + i) * 2,
                biome.x + biome.width, 
                biome.y + biome.height * 0.5
            );
            this.ctx.stroke();
        }
    }

    // Обновляем метод для запуска системы сообщений
    startMessageSystem() {
        const generateInterval = () => Math.floor(Math.random() * 3000) + 7000; // 7-10 секунд
        
        const showRandomMessage = () => {
            // Выбираем случайного покемона
            if (this.pokemons.length > 0) {
                // Фильтруем покемонов, исключая последнего говорившего
                const availablePokemons = this.pokemons.filter(p => p !== this.lastMessagePokemon);
                
                if (availablePokemons.length > 0) {
                    const randomPokemon = availablePokemons[Math.floor(Math.random() * availablePokemons.length)];
                    const randomMessage = this.pokemonClickMessages[Math.floor(Math.random() * this.pokemonClickMessages.length)];
                    
                    // Очищаем предыдущий таймер
                    if (this.messageTimer) {
                        clearTimeout(this.messageTimer);
                    }

                    // Показываем сообщение
                    this.currentMessage = {
                        pokemon: randomPokemon,
                        text: randomMessage,
                        timeLeft: this.messageDisplayTime
                    };

                    // Обновляем время последнего сообщения и последнего говорившего покемона
                    this.lastMessageTime = Date.now();
                    this.lastMessagePokemon = randomPokemon;

                    // Устанавливаем таймер для скрытия сообщения
                    this.messageTimer = setTimeout(() => {
                        this.currentMessage = null;
                        // Планируем следующее сообщение
                        setTimeout(showRandomMessage, generateInterval());
                    }, this.messageDisplayTime);
                }
            }
        };

        // Запускаем первое сообщение
        setTimeout(showRandomMessage, generateInterval());
    }

    // Добавляем вспомогательный метод для рисования скругленных прямоугольников
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }

    // Добавляем метод создания звезды
    createStar() {
        const star = {
            x: Math.random() * (this.canvas.width - 100) + 50,
            y: Math.random() * (this.canvas.height - 100) + 50,
            size: 8, // Уменьшаем размер звезды (стандартный размер покемона 24)
            rotation: Math.random() * Math.PI * 2,
            collected: false,
            carriedBy: null
        };
        this.stars.push(star);
    }

    // Добавляем метод для получения случайного интервала
    getRandomInterval(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Добавляем метод создания частицы погоды
    createWeatherParticle() {
        const particle = {
            x: Math.random() * this.canvas.width,
            y: -10,
            speed: Math.random() * 2 + 3,
            size: 0,
            angle: 0
        };

        switch (this.weather.current) {
            case 'rain':
                particle.size = Math.random() * 2 + 3;
                particle.angle = Math.PI / 3; // Угол падения дождя
                particle.color = 'rgba(120, 120, 255, 0.5)';
                break;
            case 'snow':
                particle.size = Math.random() * 3 + 2;
                particle.speed = Math.random() * 1 + 1;
                particle.angle = Math.PI / 2;
                particle.rotation = Math.random() * Math.PI * 2;
                particle.color = 'rgba(255, 255, 255, 0.8)';
                break;
            case 'wind':
                particle.size = Math.random() * 2 + 1;
                particle.x = -10;
                particle.y = Math.random() * this.canvas.height;
                particle.speed = Math.random() * 3 + 2;
                particle.color = 'rgba(200, 200, 200, 0.3)';
                break;
        }

        return particle;
    }

    // Добавляем метод обновления погоды
    updateWeather() {
        // Проверяем, нужно ли сменить погоду
        if (Date.now() > this.weather.nextChangeTime) {
            const newWeather = this.weather.possibleTypes[
                Math.floor(Math.random() * this.weather.possibleTypes.length)
            ];
            this.weather.current = newWeather;
            this.weather.nextChangeTime = Date.now() + this.getRandomInterval(20000, 40000);
            this.weather.particles = []; // Очищаем старые частицы

            // Обновляем параметры ветра
            if (this.weather.current === 'wind') {
                this.windForce = Math.random() * 2 + 1;
                this.windAngle = Math.random() * Math.PI / 4;
            }
        }

        // Добавляем новые частицы
        if (this.weather.current !== 'clear' && 
            this.weather.particles.length < this.maxParticles) {
            this.weather.particles.push(this.createWeatherParticle());
        }

        // Обновляем существующие частицы
        this.weather.particles = this.weather.particles.filter(particle => {
            // Обновляем позицию частицы
            switch (this.weather.current) {
                case 'rain':
                    particle.x += Math.cos(particle.angle) * particle.speed;
                    particle.y += Math.sin(particle.angle) * particle.speed;
                    break;
                case 'snow':
                    particle.x += Math.sin(particle.rotation) * 0.5 + Math.cos(this.windAngle) * this.windForce;
                    particle.y += particle.speed;
                    particle.rotation += 0.01;
                    break;
                case 'wind':
                    particle.x += particle.speed + Math.cos(this.windAngle) * this.windForce;
                    particle.y += Math.sin(this.windAngle) * this.windForce;
                    break;
            }

            // Отрисовываем частицу
            this.ctx.fillStyle = particle.color;
            
            if (this.weather.current === 'snow') {
                // Рисуем снежинку
                this.ctx.save();
                this.ctx.translate(particle.x, particle.y);
                this.ctx.rotate(particle.rotation);
                
                for (let i = 0; i < 6; i++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0);
                    this.ctx.lineTo(0, particle.size);
                    this.ctx.stroke();
                    this.ctx.rotate(Math.PI / 3);
                }
                
                this.ctx.restore();
            } else {
                // Рисуем дождь или ветер
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Проверяем, находится ли частица все еще в пределах экрана
            return !(particle.y > this.canvas.height || 
                    particle.x > this.canvas.width || 
                    particle.x < -20);
        });
    }

    // Обновляем метод отрисовки иконки погоды
    drawWeatherIcon() {
        this.ctx.save();
        
        // Создаем фон для иконки
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2 - 260, 40, 25, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Добавляем тень
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // Устанавливаем размер шрифта для эмодзи
        this.ctx.font = 'bold 40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Выбираем эмодзи в зависимости от погоды
        let emoji;
        switch (this.weather.current) {
            case 'rain':
                emoji = '🌧️';
                break;
            case 'snow':
                emoji = '🌨️';
                break;
            case 'wind':
                emoji = '💨';
                break;
            case 'clear':
                emoji = '☀️';
                break;
        }

        // Рисуем эмодзи
        this.ctx.fillText(emoji, this.canvas.width / 2 - 260, 40);
        
        // Сбрасываем тень
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        this.ctx.restore();
    }

    // Добавляем метод проверки клика по кнопке NFT
    isClickOnNFTButton(x, y) {
        const buttonX = this.canvas.width - 160;
        const buttonY = this.canvas.height - 40;
        const buttonWidth = 140;
        const buttonHeight = 30;
        
        return x >= buttonX && x <= buttonX + buttonWidth &&
               y >= buttonY && y <= buttonY + buttonHeight;
    }

    // Добавляем метод проверки клика по кнопке Telegram
    isClickOnTelegramButton(x, y) {
        const buttonX = 20;
        const buttonY = this.canvas.height - 40;
        const buttonWidth = 140;
        const buttonHeight = 30;
        
        return x >= buttonX && x <= buttonX + buttonWidth &&
               y >= buttonY && y <= buttonY + buttonHeight;
    }

    // Добавляем метод отрисовки кнопок
    drawButtons() {
        // Рисуем кнопку NFT справа внизу
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 3;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        
        // Фон кнопки
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        this.roundRect(
            this.canvas.width - 160,
            this.canvas.height - 40,
            140,
            30,
            15
        );
        this.ctx.fill();
        
        // Обводка кнопки
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Текст кнопки
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('NFT Collection', this.canvas.width - 90, this.canvas.height - 25);
        
        this.ctx.restore();

        // Рисуем кнопку Telegram слева внизу
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 3;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
        
        // Фон кнопки
        this.ctx.fillStyle = 'rgba(0, 136, 204, 0.7)';
        this.roundRect(
            20,
            this.canvas.height - 40,
            140,
            30,
            15
        );
        this.ctx.fill();
        
        // Обводка кнопки
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Текст кнопки
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Telegram Channel', 90, this.canvas.height - 25);
        
        this.ctx.restore();
    }
}

// Запуск игры
window.onload = () => {
    console.log('Запуск игры...');
    window.gameInstance = new Game();
}; 