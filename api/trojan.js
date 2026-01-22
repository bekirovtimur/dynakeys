const V2RAY_URL = process.env.V2RAY_URL;

export default async function handler(req, res) {
  try {
    // Загружаем исходный список прокси
    const response = await fetch(V2RAY_URL);
    const text = await response.text();

    // Отбираем только строки trojan://
    const trojanLines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.includes("trojan://"));

    if (!trojanLines.length) {
      return res.status(500).json({ error: "No trojan:// entries found" });
    }

    // Парсим все найденные строки
    const results = [];
    
    for (const line of trojanLines) {
      const parseResult = parseTrojanLine(line);
      
      if (parseResult) {
        const { countryFlag, config, isp } = parseResult;
        // Формируем результат в формате: CONFIG#CountryFlag ISP
        const formatted = `${config}#${countryFlag} ${isp}`;
        results.push(formatted);
      }
    }

    if (!results.length) {
      return res.status(500).json({ error: "Failed to parse any trojan lines" });
    }

    // Отправляем все результаты, разделенные переносом строки
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(results.join('\n'));

  } catch (err) {
    res.status(500).json({ error: "Internal error", details: err.message });
  }
}

function parseTrojanLine(line) {
  try {
    // Извлекаем флаг страны (все до первого пробела)
    const parts = line.split(' ');
    if (parts.length < 2) {
      return null;
    }
    const countryFlag = parts[0];

    // Извлекаем trojan конфиг (от trojan:// до символа #)
    const trojanMatch = line.match(/(trojan:\/\/[^#]+)/);
    if (!trojanMatch) {
      return null;
    }
    const config = trojanMatch[1];

    // Извлекаем провайдера (текст в квадратных скобках в конце строки)
    const ispMatch = line.match(/\[([^\]]+)\]$/);
    if (!ispMatch) {
      return null;
    }
    const isp = ispMatch[1];

    return {
      countryFlag,
      config,
      isp
    };
  } catch (error) {
    console.error("Error parsing trojan line:", error);
    return null;
  }
}