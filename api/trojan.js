const V2RAY_URL = process.env.V2RAY_URL;

export default async function handler(req, res) {
  try {
    // Получаем параметр country из query string
    const { country } = req.query;

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
        const { countryFlag, config, isp, countryCode } = parseResult;
        
        // Пропускаем записи без кода страны (флаг 🏳)
        if (!countryCode) {
          continue;
        }
        
        // Если указан фильтр по стране, проверяем совпадение
        if (country && countryCode !== country) {
          continue;
        }
        
        // Формируем результат в формате: CONFIG#CountryFlag ISP
        const formatted = `${config}#${countryFlag} ${isp}`;
        results.push(formatted);
      }
    }

    if (!results.length) {
      if (country) {
        return res.status(404).json({ error: `No trojan entries found for country: ${country}` });
      }
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

    // Пропускаем записи с флагом 🏳 (без страны)
    if (countryFlag === '🏳') {
      return null;
    }

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

    // Извлекаем код страны (формат: ... 102ms DE [ISP])
    // Код страны находится между временем отклика и [ISP]
    const countryCodeMatch = line.match(/\d+ms\s+([A-Z]{2})\s+\[/);
    const countryCode = countryCodeMatch ? countryCodeMatch[1] : null;

    return {
      countryFlag,
      config,
      isp,
      countryCode
    };
  } catch (error) {
    console.error("Error parsing trojan line:", error);
    return null;
  }
}