/* Форма заявки: маска телефона, проверка, отправка.
   FORM_ENDPOINT: "send.php" для обычного PHP-хостинга.
   Для статического хостинга (GitHub Pages, Netlify) укажите адрес внешнего
   сервиса, например "https://formspree.io/f/xxxxxxx" — данные уйдут тем же JSON. */
var FORM_ENDPOINT = "send.php";
var FALLBACK_PHONE = "+7 (905) 989-31-43";

(function () {
    var form = document.getElementById("form");
    if (!form) return;

    var phone = document.getElementById("phone");
    var statusText = document.getElementById("status");
    var submitBtn = form.querySelector(".submit");

    phone.addEventListener("input", function () {
        var digits = phone.value.replace(/\D/g, "");
        if (digits[0] === "8") digits = "7" + digits.slice(1);
        if (digits !== "" && digits[0] !== "7") digits = "7" + digits;
        digits = digits.slice(0, 11);

        var r = "";
        if (digits.length > 0) r = "+7";
        if (digits.length > 1) r += " (" + digits.slice(1, 4);
        if (digits.length > 4) r += ") " + digits.slice(4, 7);
        if (digits.length > 7) r += " " + digits.slice(7, 9);
        if (digits.length > 9) r += "-" + digits.slice(9, 11);
        phone.value = r;
    });

    function say(text, kind) {
        statusText.textContent = text;
        statusText.className = "status" + (kind ? " " + kind : "");
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        var name = document.getElementById("name").value.trim();
        if (name === "") { say("Напишите, как к вам обращаться.", "error"); document.getElementById("name").focus(); return; }
        if (phone.value.replace(/\D/g, "").length < 11) { say("Введите телефон полностью: 11 цифр.", "error"); phone.focus(); return; }
        if (!document.getElementById("agree").checked) { say("Поставьте галочку согласия на обработку данных.", "error"); return; }

        var seasonEl = document.getElementById("season");
        var commentEl = document.getElementById("comment");
        var trap = form.querySelector("[name=website]");
        var data = {
            name: name,
            phone: phone.value,
            format: document.getElementById("format").value,
            season: seasonEl ? seasonEl.value : "",
            comment: commentEl ? commentEl.value.trim() : "",
            via: (form.querySelector("input[name=via]:checked") || {}).value || "",
            website: trap ? trap.value : ""
        };

        submitBtn.disabled = true;
        say("Отправляем заявку…");

        fetch(FORM_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(data)
        })
            .then(function (res) {
                if (!res.ok) throw new Error("http " + res.status);
                say("Заявка принята. Мы напишем вам в течение дня и пришлём список вещей.", "ok");
                form.reset();
            })
            .catch(function () {
                say("Заявка не ушла. Позвоните " + FALLBACK_PHONE + " или напишите нам в мессенджер — ссылки внизу страницы.", "error");
            })
            .then(function () { submitBtn.disabled = false; });
    });

    // тариф из карточки подставляется в форму
    window.pickFormat = function (name) {
        var sel = document.getElementById("format");
        if (!sel) return;
        for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === name) { sel.value = name; break; }
        }
    };
})();
