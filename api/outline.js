const RAW_URL = process.env.RAW_URL;

const PREFIX = process.env.PREFIX;

// Разрешенные порты для фильтрации
const ALLOWED_PORTS = [80, 8080, 443, 8443, 7001, 7002];

export default async function handler(req, res) {
  try {
    // Загружаем исходный список прокси
    const response = await fetch(RAW_URL);
    const text = await response.text();

    // Отбираем только строки ss:// и фильтруем по разрешенным портам
    const validLines = [];
    
    const ssLines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("ss://"));

    // Парсим каждую строку и проверяем порт
    for (const line of ssLines) {
      const clean = line.split("#")[0];
      const match = clean.match(/^ss:\/\/([^@]+)@([^:]+):(\d+)$/);
      
      if (match) {
        const port = Number(match[3]);
        if (ALLOWED_PORTS.includes(port)) {
          validLines.push(line);
        }
      }
    }

    if (!validLines.length) {
      return res.status(500).json({ error: "No valid ss:// entries found with allowed ports" });
    }

    // Случайная строка из отфильтрованных
    const randomLine = validLines[Math.floor(Math.random() * validLines.length)];

    // Очищаем все после #
    const clean = randomLine.split("#")[0];

    // Разбираем ss://BASE64@host:port
    const match = clean.match(/^ss:\/\/([^@]+)@([^:]+):(\d+)$/);
    if (!match) {
      return res.status(500).json({ error: "Invalid ss format" });
    }

    const [, encoded, server, port] = match;

    // Декодируем Base64 → method:password
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const [method, password] = decoded.split(":");

    // Формируем JSON как строку
    const jsonString = `{"server":"${server}","server_port":${Number(port)},"password":"${password}","method":"${method}","prefix":"${PREFIX}"}`;

    // Отправка ответа
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(jsonString);

  } catch (err) {
    res.status(500).json({ error: "Internal error", details: err.message });
  }
}