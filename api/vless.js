const V2RAY_URL = process.env.V2RAY_URL;

const PROFILE_NAME = "DynaKeys🔹";
const PROTOCOL = "vless";

// Функция для генерации заголовка профиля
function generateProfileHeader(country) {
  // Формируем название профиля
  let profileTitle = PROFILE_NAME + PROTOCOL;
  
  // Добавляем флаг страны, если указан
  if (country) {
    profileTitle += "🔹" + country;
  }
  
  // Кодируем в base64
  const base64Title = Buffer.from(profileTitle, "utf-8").toString("base64");
  
  return `//profile-title: DynaKeys
//profile-title: base64:${base64Title}
//profile-update-interval: 1
//subscription-userinfo: upload=0; download=0; total=10737418240000000; expire=2546249531
//support-url: https://github.com/bekirovtimur/dynakeys/issues 
//profile-web-page-url: https://dynakeys.vercel.app
`;
}

export default async function handler(req, res) {
  try {
    // Получаем параметр country из query string
    const { country } = req.query;

    // Генерируем заголовок профиля
    const profileHeader = generateProfileHeader(country);

    // Загружаем исходный список прокси
    const response = await fetch(V2RAY_URL);
    const text = await response.text();

    // Отбираем только строки vless://
    const vlessLines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.includes("vless://"));

    // Парсим все найденные строки
    const results = [];
    
    for (const line of vlessLines) {
      const parseResult = parseVlessLine(line);
      
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

    // Формируем полный ответ с заголовком
    const fullResponse = profileHeader + results.join('\n');

    // Отправляем все результаты, разделенные переносом строки
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(fullResponse);

  } catch (err) {
    // При ошибке возвращаем заголовок с текущим country (если был)
    const { country } = req.query;
    const profileHeader = generateProfileHeader(country);
    res.setHeader("Content-Type", "text/plain");
    res.status(200).send(profileHeader);
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
