<?php
/**
 * Приём заявок с сайта. Заменяет прежнего Telegram-бота.
 * Каналы: e-mail, VK (сообщения сообщества), MAX (бот).
 * Включённым считается канал, для которого заполнены данные в config.php.
 * Заявка ВСЕГДА пишется в requests.log.php (на случай, если каналы недоступны).
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$cfgFile = __DIR__ . '/config.php';
$cfg = is_file($cfgFile) ? require $cfgFile : [];
$cfg += [
    'email_to'     => '',
    'email_from'   => '',
    'vk_token'     => '',
    'vk_user_ids'  => [],
    'max_token'    => '',
    'max_user_ids' => [],
    'max_chat_ids' => [],
    'allowed_origin' => '',
];

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!empty($cfg['allowed_origin'])) {
    header('Access-Control-Allow-Origin: ' . $cfg['allowed_origin']);
    header('Access-Control-Allow-Headers: Content-Type');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') respond(204, []);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['ok' => false, 'error' => 'Method not allowed']);

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) $data = $_POST;

$clean = function ($v, int $max = 100): string {
    $v = is_string($v) ? $v : '';
    $v = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v);
    return mb_substr(trim($v), 0, $max);
};

// Ловушка для ботов: поле «website» скрыто от людей
if (!empty($data['website'])) respond(200, ['ok' => true]);

$name    = $clean($data['name']    ?? '', 60);
$phone   = $clean($data['phone']   ?? '', 25);
$format  = $clean($data['format']  ?? '', 40);
$via     = $clean($data['via']     ?? '', 20);
$season  = $clean($data['season']  ?? '', 40);
$comment = $clean($data['comment'] ?? '', 300);

if ($name === '' || strlen(preg_replace('/\D/', '', $phone)) < 11) {
    respond(422, ['ok' => false, 'error' => 'Укажите имя и телефон']);
}

// Не чаще одной заявки в 20 секунд с одного IP
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$rateFile = sys_get_temp_dir() . '/exp_rate_' . md5($ip);
if (is_file($rateFile) && time() - filemtime($rateFile) < 20) {
    respond(429, ['ok' => false, 'error' => 'Подождите немного и отправьте снова']);
}
@touch($rateFile);

$lines = [
    'Новая заявка с сайта',
    "Имя: $name",
    "Телефон: $phone",
    'Формат: ' . ($format !== '' ? $format : 'не выбран'),
];
if ($season !== '')  $lines[] = "Заезд: $season";
$lines[] = "Связаться через: " . ($via !== '' ? $via : 'не указано');
if ($comment !== '') $lines[] = "Комментарий: $comment";
$text = implode("\n", $lines);

// 1. Журнал (файл начинается с <?php exit, поэтому по ссылке не читается)
$log = __DIR__ . '/requests.log.php';
if (!is_file($log)) @file_put_contents($log, "<?php http_response_code(404); exit; ?>\n", LOCK_EX);
@file_put_contents($log, '[' . date('Y-m-d H:i:s') . '] ' . str_replace("\n", ' | ', $text) . PHP_EOL, FILE_APPEND | LOCK_EX);

function http_post(string $url, array $opts): ?array {
    $ch = curl_init($url);
    curl_setopt_array($ch, $opts + [CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 12]);
    $res = curl_exec($ch);
    curl_close($ch);
    $j = $res ? json_decode($res, true) : null;
    return is_array($j) ? $j : null;
}

$delivered = [];
$errors = [];

// 2. E-mail
if ($cfg['email_to'] !== '') {
    $from = $cfg['email_from'] !== '' ? $cfg['email_from'] : 'noreply@' . preg_replace('/^www\./', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
    $subject = '=?UTF-8?B?' . base64_encode('Заявка на экспедицию: ' . $name) . '?=';
    $headers = "From: $from\r\nContent-Type: text/plain; charset=UTF-8\r\nMIME-Version: 1.0\r\n";
    if (@mail($cfg['email_to'], $subject, $text, $headers)) $delivered[] = 'email';
    else $errors[] = 'email';
}

// 3. VK: сообщение от имени сообщества (токен сообщества с правом «сообщения»)
if ($cfg['vk_token'] !== '' && $cfg['vk_user_ids']) {
    $ok = false;
    foreach ($cfg['vk_user_ids'] as $uid) {
        $r = http_post('https://api.vk.com/method/messages.send', [CURLOPT_POSTFIELDS => [
            'user_id' => $uid, 'random_id' => random_int(1, PHP_INT_MAX >> 1),
            'message' => $text, 'access_token' => $cfg['vk_token'], 'v' => '5.199',
        ]]);
        if ($r && isset($r['response'])) $ok = true;
        else @file_put_contents($log, '[VK ERROR] ' . json_encode($r, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
    $ok ? $delivered[] = 'vk' : $errors[] = 'vk';
}

// 4. MAX: бот платформы MAX (platform-api.max.ru)
if ($cfg['max_token'] !== '' && ($cfg['max_user_ids'] || $cfg['max_chat_ids'])) {
    $targets = [];
    foreach ($cfg['max_user_ids'] as $id) $targets[] = 'user_id=' . urlencode((string)$id);
    foreach ($cfg['max_chat_ids'] as $id) $targets[] = 'chat_id=' . urlencode((string)$id);
    $ok = false;
    foreach ($targets as $t) {
        $r = http_post('https://platform-api.max.ru/messages?' . $t, [
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: ' . $cfg['max_token']],
            CURLOPT_POSTFIELDS => json_encode(['text' => $text], JSON_UNESCAPED_UNICODE),
        ]);
        if ($r && isset($r['message'])) $ok = true;
        else @file_put_contents($log, '[MAX ERROR] ' . json_encode($r, JSON_UNESCAPED_UNICODE) . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
    $ok ? $delivered[] = 'max' : $errors[] = 'max';
}

if ($delivered) respond(200, ['ok' => true, 'via' => $delivered]);
respond(502, ['ok' => false, 'error' => 'Не удалось доставить заявку. Позвоните: +7 (905) 989-31-43']);
