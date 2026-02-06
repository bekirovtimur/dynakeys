const V2RAY_URL = process.env.V2RAY_URL;

const PROFILE_NAME = "DynaKeys🔹";

export default async function handler(req, res) {
  try {
    // Получаем параметры из query string
    const { proto, country } = req.query;

    // Определяем, какие протоколы искать
    const protocols = proto ? [proto] : ['vless', 'trojan'];

    // Загружаем исходный список прокси
    const response = await fetch(V2RAY_URL);
    const text = await response.text();

    // Парсим все найденные строки
    const results = [];
    let firstCountryFlag = null;
    
    for (const line of text.split("\n")) {
      const trimmedLine = line.trim();
      
      // Проверяем, содержит ли строка нужный протокол
      const hasVless = trimmedLine.includes("vless://");
      const hasTrojan = trimmedLine.includes("trojan://");
      
      if (!hasVless && !hasTrojan) {
        continue;
      }
      
      // Если указан протокол, проверяем совпадение
      if (proto && !trimmedLine.includes(`${proto}://`)) {
        continue;
      }
      
      // Парсим строку
      const parseResult = hasVless ? parseVlessLine(trimmedLine) : parseTrojanLine(trimmedLine);
      
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
        
        // Сохраняем флаг первой подходящей конфигурации
        if (!firstCountryFlag) {
          firstCountryFlag = countryFlag;
        }
        
        // Формируем результат в формате: CONFIG#CountryFlag ISP
        const formatted = `${config}#${countryFlag} ${isp}`;
        results.push(formatted);
      }
    }

    // Генерируем заголовок профиля
    // Если указан country, добавляем флаг, иначе только DynaKeys🔹
    const profileHeader = generateProfileHeader(proto, country ? firstCountryFlag : null);

    // Формируем полный ответ с заголовком
    const fullResponse = profileHeader + results.join('\n');

    // Отправляем все результаты, разделенные переносом строки
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(fullResponse);

  } catch (err) {
    // При ошибке возвращаем заголовок без флага
    const profileHeader = generateProfileHeader(proto, null);
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(profileHeader);
  }
}

// Функция для генерации заголовка профиля
function generateProfileHeader(proto, countryFlag) {
  // Формируем название профиля
  let profileTitle = PROFILE_NAME;
  
  // Добавляем протокол, если указан
  if (proto) {
    profileTitle += proto + "🔹";
  }
  
  // Добавляем флаг страны, если указан
  if (countryFlag) {
    profileTitle += countryFlag;
  }
  
  // Кодируем в base64
  const base64Title = Buffer.from(profileTitle, "utf-8").toString("base64");
  
  return `//profile-title: base64:${base64Title}
//profile-update-interval: 1
//subscription-userinfo: upload=0; download=0; total=10737418240000000; expire=2546249531
//support-url: https://github.com/bekirovtimur/dynakeys/issues 
//profile-web-page-url: https://dynakeys.vercel.app
`;
}

function parseVlessLine(line) {
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
    console.error("Error parsing vless line:", error);
    return null;
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
