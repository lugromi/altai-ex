// Меню на телефоне
(function () {
    var burger = document.getElementById("burger");
    var nav = document.getElementById("nav");
    function setOpen(open) {
        nav.classList.toggle("open", open);
        burger.setAttribute("aria-expanded", open ? "true" : "false");
    }
    burger.addEventListener("click", function () { setOpen(!nav.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A") setOpen(false); });
})();

// «Как определиться с форматом?» — тест по диаграмме
(function () {
    var R = {
        glamping: { name: "Глэмпинг VIP", text: "Полный сезон с комфортом: просторный глэмпинг с кроватью, питание три раза в день, душ и туалет. Раскопки по желанию, так что отдых можно выбирать самому." },
        base: { name: "Базовый", text: "Две недели в палатке: спальник, одеяло и коврик мы выдадим. Питание, душ, трансфер из Барнаула, вся программа и инвентарь уже включены." },
        own: { name: "Со своим", text: "Две недели со своим снаряжением: вы платите только за питание, трансфер и программу. Самый доступный способ прожить полный заезд." },
        weekly: { name: "Недельный", text: "Неделя, чтобы погрузиться по-настоящему: палатка, спальник, питание, вся программа и инвентарь. Хватит, чтобы втянуться в раскоп." },
        weeklyVip: { name: "Недельный VIP", text: "Неделя полного погружения, но с комфортом: просторный глэмпинг с кроватью вместо палатки, питание три раза в день, душ и туалет." },
        fast: { name: "Быстрый", text: "Несколько дней, чтобы легко познакомиться с экспедиционной жизнью и попробовать себя в роли археолога. Без трансфера." },
        fastVip: { name: "Быстрый VIP", text: "Несколько дней знакомства с экспедицией, но с комфортом: просторный глэмпинг с кроватью, питание три раза в день, душ и туалет." }
    };

    var PAY = "Готовы ли Вы доплачивать за комфорт?";
    var GEAR = "Есть ли у Вас своё снаряжение?";
    var DEPTH = "Насколько сильно Вы хотите погрузиться в экспедицию?";
    var FULL = "Хочу полное погружение";
    var LIGHT = "Хочу лёгкое знакомство с экспедиционной жизнью";

    var Q = {
        start: { q: "На какой срок хотите приехать?", a: [
            ["Меньше недели", "why"], ["Ещё не знаю", "why"], ["Больше недели", "longPay"] ] },
        longPay: { q: PAY, a: [["Да", "=glamping"], ["Нет", "longGear"]] },
        longGear: { q: GEAR, a: [["Да", "longCarry"], ["Нет", "=base"]] },
        longCarry: { q: "Вы можете взять снаряжение с собой?", a: [["Да", "=own"], ["Нет", "=base"]] },

        why: { q: "Что повлияло на выбор неполного сезона или неуверенность в выборе?", a: [
            ["Деньги", "moneyGear"],
            ["Время, обстоятельства или другие личные причины", "depth"],
            ["Еду в первый раз, не уверен(а), моё ли это", "stay"] ] },

        moneyGear: { q: GEAR, a: [["Да", "money2w"], ["Нет", "depth"]] },
        money2w: { q: "Остались бы Вы на 2 недели, если бы цена была для Вас более доступной?", a: [["Да", "=own"], ["Нет", "depthMoney"]] },
        depthMoney: { q: DEPTH, a: [[FULL, "=weekly"], [LIGHT, "=fast"]] },

        depth: { q: DEPTH, a: [[FULL, "weeklyPay"], [LIGHT, "fastPay"]] },
        weeklyPay: { q: PAY, a: [["Да", "=weeklyVip"], ["Нет", "=weekly"]] },
        fastPay: { q: PAY, a: [["Да", "=fastVip"], ["Нет", "=fast"]] },

        stay: { q: "Если формат Вам понравится, останетесь подольше?", a: [["Да", "stayLong"], ["Нет", "depth"]] },
        stayLong: { q: "Насколько Вы бы остались?", a: [["Ещё на несколько дней", "weeklyPay"], ["Ещё на неделю", "weekPay"]] },
        weekPay: { q: PAY, a: [["Да", "=glamping"], ["Нет", "=base"]] }
    };

    var panel = document.getElementById("pickPanel");
    var textEl = document.getElementById("pickText");
    var recEl = document.getElementById("pickRec");
    var chipsEl = document.getElementById("pickChips");
    var btn = document.getElementById("pickBtn");
    if (!panel) return;

    var history = [];   // пройденные вопросы
    var current = "start";
    var result = null;

    function chip(label, cls, handler) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (cls ? " " + cls : "");
        b.textContent = label;
        b.addEventListener("click", handler);
        return b;
    }

    function render(focus) {
        chipsEl.textContent = "";
        if (result) {
            var r = R[result];
            textEl.textContent = r.text;
            recEl.textContent = "Подойдёт формат ";
            var b = document.createElement("b");
            b.textContent = "«" + r.name + "»";
            recEl.appendChild(b);
            btn.hidden = false;
            if (history.length) chipsEl.appendChild(chip("← Назад", "chip-ghost", back));
            chipsEl.appendChild(chip("Пройти заново", "chip-ghost", restart));
        } else {
            var n = Q[current];
            textEl.textContent = n.q;
            recEl.textContent = "Вопрос " + (history.length + 1);
            btn.hidden = true;
            n.a.forEach(function (ans) {
                chipsEl.appendChild(chip(ans[0], "", function () { answer(ans[1]); }));
            });
            if (history.length) chipsEl.appendChild(chip("← Назад", "chip-ghost", back));
        }
        if (focus) { var first = chipsEl.querySelector(".chip"); if (first) first.focus({ preventScroll: true }); }
    }

    function answer(target) {
        history.push(current);
        if (target.charAt(0) === "=") result = target.slice(1);
        else current = target;
        render(true);
    }
    function back() {
        result = null;
        current = history.pop();
        render(true);
    }
    function restart() {
        history = []; current = "start"; result = null;
        render(true);
    }

    btn.addEventListener("click", function () { if (result) window.pickFormat(R[result].name); });
    render(false);
})();

// Недельный / VIP и Быстрый / VIP: переключатель на карточке
(function () {
    var rows = document.querySelectorAll(".plan-switch");
    Array.prototype.forEach.call(rows, function (row) {
        var base = row.querySelector(".ps-base");
        var vip = row.querySelector(".ps-vip");
        var text = row.querySelector(".ps-text");
        var price = row.querySelector(".ps-price");
        var unit = row.querySelector(".ps-unit");
        var pick = row.querySelector(".pick-format");

        function set(on) {
            var k = on ? "data-vip" : "data-base";
            row.classList.toggle("is-vip", on);
            base.classList.toggle("on", !on);
            vip.classList.toggle("on", on);
            base.setAttribute("aria-pressed", on ? "false" : "true");
            vip.setAttribute("aria-pressed", on ? "true" : "false");
            text.textContent = text.getAttribute(k);
            price.textContent = price.getAttribute(k);
            unit.textContent = unit.getAttribute(k);
            pick.setAttribute("data-format", pick.getAttribute(k));
        }
        base.addEventListener("click", function () { set(false); });
        vip.addEventListener("click", function () { set(!row.classList.contains("is-vip")); });
    });
})();

// Кнопки «Выбрать» в форматах
(function () {
    var buttons = document.querySelectorAll(".pick-format");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener("click", function () {
            window.pickFormat(this.getAttribute("data-format"));
            document.getElementById("application").scrollIntoView({ behavior: "smooth" });
        });
    }
})();

// Отзывы: переключение стрелками и свайпом
(function () {
    var grid = document.getElementById("revGrid");
    if (!grid) return;
    var items = grid.querySelectorAll("figure");
    var count = document.getElementById("revCount");
    function index() {
        var step = items[1] ? items[1].offsetLeft - items[0].offsetLeft : grid.clientWidth;
        return Math.round(grid.scrollLeft / step);
    }
    function show() { count.textContent = (index() + 1) + " / " + items.length; }
    function go(d) {
        var i = (index() + d + items.length) % items.length;
        grid.scrollTo({ left: items[i].offsetLeft - items[0].offsetLeft, behavior: "smooth" });
    }
    document.getElementById("revPrev").addEventListener("click", function () { go(-1); });
    document.getElementById("revNext").addEventListener("click", function () { go(1); });
    grid.addEventListener("scroll", show);
    grid.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
    });
    show();
})();

// Форматы: карточка приподнимается при нажатии
(function () {
    var cards = document.querySelectorAll(".plan, .plans-more li");
    function lift(card) {
        for (var i = 0; i < cards.length; i++) cards[i].classList.remove("is-lifted");
        card.classList.add("is-lifted");
    }
    for (var i = 0; i < cards.length; i++) {
        cards[i].addEventListener("click", function () { lift(this); });
    }
})();

// Занятия: бесконечная автопрокрутка, пауза при наведении
(function () {
    var strip = document.querySelector(".strip");
    if (!strip) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var orig = Array.prototype.slice.call(strip.children);
    orig.forEach(function (n) {
        var c = n.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        c.tabIndex = -1;
        strip.appendChild(c);
    });
    strip.classList.add("is-auto");
    var paused = false, pos = 0, speed = 0.6;
    function stop() { paused = true; }
    function go() { paused = false; }
    strip.addEventListener("mouseenter", stop);
    strip.addEventListener("mouseleave", go);
    strip.addEventListener("touchstart", stop, { passive: true });
    strip.addEventListener("touchend", function () { setTimeout(go, 1500); }, { passive: true });
    strip.addEventListener("focusin", stop);
    strip.addEventListener("focusout", go);
    function tick() {
        var half = strip.children[orig.length].offsetLeft - strip.children[0].offsetLeft;
        if (paused || document.body.classList.contains("modal-open")) { pos = strip.scrollLeft; }
        else {
            pos += speed;
            if (pos >= half) pos -= half;
            strip.scrollLeft = pos;
        }
        if (strip.scrollLeft >= half && paused) { strip.scrollLeft -= half; pos = strip.scrollLeft; }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
})();


// Телефон: «Место где оживает прошлое» — аккордеон, зачёркнутый тезис всегда виден
(function () {
    var items = document.querySelectorAll(".swap li");
    var mq = window.matchMedia("(max-width:720px)");
    if (!items.length) return;
    document.documentElement.classList.add("js");
    Array.prototype.forEach.call(items, function (li, i) {
        var from = li.querySelector(".from");
        from.setAttribute("role", "button");
        from.tabIndex = 0;
        from.setAttribute("aria-expanded", "false");
        function toggle() {
            if (!mq.matches) return;
            var open = !li.classList.contains("open");
            Array.prototype.forEach.call(items, function (o) {
                o.classList.remove("open");
                o.querySelector(".from").setAttribute("aria-expanded", "false");
            });
            li.classList.toggle("open", open);
            from.setAttribute("aria-expanded", open ? "true" : "false");
        }
        from.addEventListener("click", toggle);
        from.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
        });
        if (i === 0) { li.classList.add("open"); from.setAttribute("aria-expanded", "true"); }
    });
})();

// Форматы: «Что входит» раскрывает список, популярный тариф по центру карусели
(function () {
    var plans = document.querySelector(".plans");
    if (!plans) return;
    Array.prototype.forEach.call(plans.querySelectorAll(".plan-toggle"), function (b) {
        b.addEventListener("click", function (e) {
            e.stopPropagation();
            var card = b.closest(".plan");
            var open = !card.classList.contains("open");
            card.classList.toggle("open", open);
            b.setAttribute("aria-expanded", open ? "true" : "false");
            b.textContent = open ? "Свернуть" : "Что входит";
        });
    });
    function center() {
        var top = plans.querySelector(".plan-top");
        if (plans.scrollWidth > plans.clientWidth + 4 && top) {
            plans.scrollLeft += top.getBoundingClientRect().left - plans.getBoundingClientRect().left - (plans.clientWidth - top.offsetWidth) / 2;
        }
    }
    window.addEventListener("load", center);
})();

// Питание: на телефоне фото листаются сами, пауза при касании
(function () {
    var grid = document.querySelector(".food-grid");
    var mq = window.matchMedia("(max-width:720px)");
    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var paused = false, timer;
    function hold() { paused = true; clearTimeout(timer); timer = setTimeout(function () { paused = false; }, 6000); }
    grid.addEventListener("touchstart", hold, { passive: true });
    grid.addEventListener("pointerdown", hold);
    grid.addEventListener("wheel", hold, { passive: true });
    setInterval(function () {
        if (!mq.matches || paused || document.hidden) return;
        var imgs = grid.children, step = imgs[1].offsetLeft - imgs[0].offsetLeft;
        var atEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4;
        grid.scrollTo({ left: atEnd ? 0 : grid.scrollLeft + step, behavior: "smooth" });
    }, 3500);
})();

// Отзывы на телефоне: длинный текст сворачивается, «Читать полностью»
(function () {
    var figs = document.querySelectorAll(".reviews figure");
    var mq = window.matchMedia("(max-width:720px)");
    Array.prototype.forEach.call(figs, function (fig) {
        var q = fig.querySelector("blockquote");
        var b = document.createElement("button");
        b.type = "button";
        b.className = "rev-more";
        b.textContent = "Читать полностью";
        b.setAttribute("aria-expanded", "false");
        b.addEventListener("click", function () {
            var open = fig.classList.toggle("open");
            b.textContent = open ? "Свернуть" : "Читать полностью";
            b.setAttribute("aria-expanded", open ? "true" : "false");
        });
        q.insertAdjacentElement("afterend", b);
    });
    function check() {
        Array.prototype.forEach.call(figs, function (fig) {
            var q = fig.querySelector("blockquote"), b = fig.querySelector(".rev-more");
            if (!mq.matches) { b.hidden = true; return; }
            var wasOpen = fig.classList.contains("open");
            fig.classList.remove("open");
            b.hidden = !(q.scrollHeight > q.clientHeight + 2);
            if (wasOpen) fig.classList.add("open");
        });
    }
    window.addEventListener("load", check);
    window.addEventListener("resize", check);
})();

// Занятия: окно с фотографиями и описанием (компьютер и телефон)
(function () {
    var dlg = document.getElementById("actModal");
    var strip = document.querySelector(".strip");
    var data = window.ACTIVITIES;
    if (!dlg || !strip || !data) return;
    var track = document.getElementById("actTrack");
    var count = document.getElementById("actCount");
    var prev = document.getElementById("actPrev");
    var next = document.getElementById("actNext");
    var opener = null;

    function index() { return Math.round(track.scrollLeft / track.clientWidth); }
    function show() { count.textContent = (index() + 1) + " / " + track.children.length; }
    function go(d) {
        var n = track.children.length;
        track.scrollTo({ left: ((index() + d + n) % n) * track.clientWidth, behavior: "smooth" });
    }
    function open(id, from) {
        var a = data[id];
        if (!a) return;
        opener = from;
        track.textContent = "";
        a.photos.forEach(function (src, i) {
            var im = document.createElement("img");
            im.src = src;
            im.alt = i === 0 ? a.title : a.title + ", фото " + (i + 1);
            track.appendChild(im);
        });
        document.getElementById("actTitle").textContent = a.title;
        document.getElementById("actText").textContent = a.text;
        var many = a.photos.length > 1;
        prev.hidden = next.hidden = count.hidden = !many;
        track.scrollLeft = 0;
        if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
        document.body.classList.add("modal-open");
        if (many) show();
    }
    function close() {
        if (dlg.close) dlg.close(); else dlg.removeAttribute("open");
    }
    dlg.addEventListener("close", function () {
        document.body.classList.remove("modal-open");
        if (opener && opener.focus) opener.focus({ preventScroll: true });
    });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
    document.getElementById("actClose").addEventListener("click", close);
    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });
    track.addEventListener("scroll", show);
    track.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
    });

    strip.addEventListener("click", function (e) {
        var fig = e.target.closest("figure[data-act]");
        if (fig) open(fig.getAttribute("data-act"), fig);
    });
    strip.addEventListener("keydown", function (e) {
        var fig = e.target.closest("figure[data-act]");
        if (fig && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(fig.getAttribute("data-act"), fig); }
    });
})();
