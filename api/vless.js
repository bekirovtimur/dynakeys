const V2RAY_URL = process.env.V2RAY_URL;

export default async function handler(req, res) {
  try {
    // Загружаем исходный список прокси
    const response = await fetch(V2RAY_URL);
    const text = await response.text();

    // Отбираем только строки vless://
    const vlessLines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.includes("vless://"));

    if (!vlessLines.length) {
      return res.status(500).json({ error: "No vless:// entries found" });
    }

    // Парсим все найденные строки
    const results = [];
    
    for (const line of vlessLines) {
      const parseResult = parseVlessLine(line);
      
      if (parseResult) {
        const { countryFlag, config, isp } = parseResult;
        // Формируем результат в формате: CONFIG#CountryFlag ISP
        const formatted = `${config}#${countryFlag} ${isp}`;
        results.push(formatted);
      }
    }

    if (!results.length) {
      return res.status(500).json({ error: "Failed to parse any vless lines" });
    }

    // Отправляем все результаты, разделенные переносом строки
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(results.join('\n'));

  } catch (err) {
    res.status(500).json({ error: "Internal error", details: err.message });
  }
}

function parseVlessLine(line) {
  try {
    // Извлекаем флаг страны (все до первого пробела)
    const parts = line.split(' ');
    if (parts.length < 2) {
      return null;
    }
    const countryFlag = parts[0];

    // Извлекаем vless конфиг (от vless:// до символа #)
    const vlessMatch = line.match(/(vless:\/\/[^#]+)/);
    if (!vlessMatch) {
      return null;
    }
    const config = vlessMatch[1];

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
    console.error("Error parsing vless line:", error);
    return null;
  }
}