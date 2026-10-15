/**
 * Weather Mission - weather.js
 * Open-Meteo API 通信 & 天候データ変換モジュール
 */

// 対応都市の定義
export const CITIES = {
  nagoya: {
    id: 'nagoya',
    name: '名古屋',
    lat: 35.1815,
    lon: 136.9066
  },
  tokyo: {
    id: 'tokyo',
    name: '東京',
    lat: 35.6895,
    lon: 139.6917
  },
  osaka: {
    id: 'osaka',
    name: '大阪',
    lat: 34.6937,
    lon: 135.5023
  }
};

// WMO 天候コード対応表（定義・日本語名・ピクセル風アイコン・悪天候判定）
// 参考: WMO Code Table 4677 / Open-Meteo Documentation
export const WMO_CODES = {
  0: { label: '快晴', icon: '☀️', isSevere: false },
  1: { label: '晴れ', icon: '🌤️', isSevere: false },
  2: { label: '一部曇り', icon: '⛅', isSevere: false },
  3: { label: '曇り', icon: '☁️', isSevere: false },
  45: { label: '霧', icon: '🌫️', isSevere: false },
  48: { label: '霧氷', icon: '🌫️', isSevere: false },
  51: { label: '小雨 (霧雨)', icon: '🌦️', isSevere: false },
  53: { label: '並の霧雨', icon: '🌧️', isSevere: false },
  55: { label: '強い霧雨', icon: '🌧️', isSevere: false },
  56: { label: '着氷性の霧雨 (弱)', icon: '🌧️', isSevere: false },
  57: { label: '着氷性の霧雨 (強)', icon: '🌧️', isSevere: false },
  61: { label: '小雨', icon: '🌧️', isSevere: false },
  63: { label: '雨', icon: '🌧️', isSevere: false },
  65: { label: '大雨', icon: '🌊', isSevere: true }, // 大雨
  66: { label: '着氷性の雨 (弱)', icon: '🌧️', isSevere: false },
  67: { label: '着氷性の雨 (強)', icon: '🌧️', isSevere: true },
  71: { label: '小雪', icon: '🌨️', isSevere: false },
  73: { label: '並の雪', icon: '🌨️', isSevere: false },
  75: { label: '大雪', icon: '❄️', isSevere: true },
  77: { label: '雪あられ', icon: '❄️', isSevere: false },
  80: { label: 'にわか雨 (弱)', icon: '🌦️', isSevere: false },
  81: { label: 'にわか雨 (並)', icon: '🌧️', isSevere: false },
  82: { label: '激しいにわか雨', icon: '⛈️', isSevere: true }, // 激しいにわか雨
  85: { label: 'にわか雪 (弱)', icon: '🌨️', isSevere: false },
  86: { label: 'にわか雪 (強)', icon: '❄️', isSevere: true },
  95: { label: '雷雨', icon: '⚡', isSevere: true }, // 雷雨
  96: { label: '雷雨 (霰を伴う)', icon: '⛈️', isSevere: true }, // 雹・霰を伴う雷雨
  99: { label: '激しい雷雨 (雹を伴う)', icon: '⛈️', isSevere: true } // 激しい雷雨
};

/**
 * 天候コード情報取得ヘルパー
 * @param {number} code
 */
export function getWeatherInfo(code) {
  if (code !== null && code !== undefined && WMO_CODES[code]) {
    return { ...WMO_CODES[code], code };
  }
  return {
    code: code ?? -1,
    label: code !== null && code !== undefined ? `不明 (コード:${code})` : '天候データなし',
    icon: '❓',
    isSevere: false
  };
}

/**
 * 大雨・雷雨に該当する天候コードか判定
 * @param {number} code
 * @returns {boolean}
 */
export function isSevereRainOrThunder(code) {
  const severeCodes = [65, 67, 82, 95, 96, 99];
  return severeCodes.includes(Number(code));
}

/**
 * Open-Meteo API から天気データを取得する
 * @param {string} cityKey 'nagoya' | 'tokyo' | 'osaka'
 * @param {object} options { timeoutMs = 8000 }
 * @returns {Promise<object>} 整形された天気データ
 */
export async function fetchWeatherData(cityKey = 'nagoya', options = {}) {
  const city = CITIES[cityKey];
  if (!city) {
    throw new Error(`無効な都市キーです: ${cityKey}`);
  }

  const timeoutMs = options.timeoutMs || 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const endpoint = 'https://api.open-meteo.com/v1/forecast';
  const params = new URLSearchParams({
    latitude: city.lat.toString(),
    longitude: city.lon.toString(),
    current: 'temperature_2m,weather_code',
    daily: 'temperature_2m_max,precipitation_probability_max',
    timezone: 'Asia/Tokyo',
    forecast_days: '1'
  });

  const url = `${endpoint}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      let errorDetails = '';
      try {
        const errJson = await res.json();
        errorDetails = errJson.reason || errJson.message || '';
      } catch (_) {
        // JSONでなければ無視
      }
      throw new Error(`HTTPエラー (${res.status} ${res.statusText})${errorDetails ? ': ' + errorDetails : ''}`);
    }

    const data = await res.json();

    // データ整合性の検証
    if (!data.current || typeof data.current.temperature_2m !== 'number') {
      throw new Error('APIレスポンスに現在の気温データが含まれていません。');
    }
    if (!data.daily || !Array.isArray(data.daily.temperature_2m_max) || data.daily.temperature_2m_max.length === 0) {
      throw new Error('APIレスポンスに日別の最高気温データが含まれていません。');
    }

    const weatherInfo = getWeatherInfo(data.current.weather_code);
    const targetDate = data.daily.time?.[0] || '不明';
    const tempMax = data.daily.temperature_2m_max[0];
    const precipProbMax = Array.isArray(data.daily.precipitation_probability_max)
      ? data.daily.precipitation_probability_max[0]
      : null;

    return {
      isDemo: false,
      fetchedAt: new Date().toISOString(),
      city: {
        id: city.id,
        name: city.name,
        lat: city.lat,
        lon: city.lon
      },
      current: {
        time: data.current.time,
        temperature: data.current.temperature_2m,
        weatherCode: data.current.weather_code,
        weatherLabel: weatherInfo.label,
        weatherIcon: weatherInfo.icon,
        isSevere: weatherInfo.isSevere
      },
      daily: {
        targetDate,
        tempMax: tempMax,
        precipProbMax: precipProbMax
      },
      rawUnits: {
        temperature: data.current_units?.temperature_2m || '°C',
        precipitationProbability: data.daily_units?.precipitation_probability_max || '%'
      },
      timezone: data.timezone || 'Asia/Tokyo'
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`API通信がタイムアウトしました (${timeoutMs / 1000}秒)。通信環境をご確認ください。`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 発表・動作確認用の固定DEMOテストデータ集
 * 各条件分岐を網羅できるように設定
 */
export const DEMO_PRESETS = {
  heatwave: {
    id: 'heatwave',
    label: '【DEMO】猛暑 (最高36.5℃)',
    description: '条件1: 今日の最高気温が35℃以上',
    data: {
      isDemo: true,
      demoScenario: 'heatwave',
      fetchedAt: new Date().toISOString(),
      city: { id: 'nagoya', name: '名古屋(DEMO)', lat: 35.1815, lon: 136.9066 },
      current: {
        time: '2026-08-05T14:00',
        temperature: 36.2,
        weatherCode: 0,
        weatherLabel: '快晴',
        weatherIcon: '☀️',
        isSevere: false
      },
      daily: {
        targetDate: '2026-08-05',
        tempMax: 36.5,
        precipProbMax: 10
      },
      rawUnits: { temperature: '°C', precipitationProbability: '%' },
      timezone: 'Asia/Tokyo'
    }
  },
  severe_rain: {
    id: 'severe_rain',
    label: '【DEMO】大雨・雷雨 (コード95)',
    description: '条件2: 大雨・雷雨に該当する天候コード (気温30℃, 降水確率50%)',
    data: {
      isDemo: true,
      demoScenario: 'severe_rain',
      fetchedAt: new Date().toISOString(),
      city: { id: 'tokyo', name: '東京(DEMO)', lat: 35.6895, lon: 139.6917 },
      current: {
        time: '2026-07-10T16:00',
        temperature: 28.0,
        weatherCode: 95, // 雷雨
        weatherLabel: '雷雨',
        weatherIcon: '⚡',
        isSevere: true
      },
      daily: {
        targetDate: '2026-07-10',
        tempMax: 30.0,
        precipProbMax: 50
      },
      rawUnits: { temperature: '°C', precipitationProbability: '%' },
      timezone: 'Asia/Tokyo'
    }
  },
  high_precip: {
    id: 'high_precip',
    label: '【DEMO】降水確率高 (70%)',
    description: '条件3: 最大降水確率が60%以上 (曇りコード3, 気温24℃)',
    data: {
      isDemo: true,
      demoScenario: 'high_precip',
      fetchedAt: new Date().toISOString(),
      city: { id: 'osaka', name: '大阪(DEMO)', lat: 34.6937, lon: 135.5023 },
      current: {
        time: '2026-06-20T10:00',
        temperature: 22.5,
        weatherCode: 3, // 曇り
        weatherLabel: '曇り',
        weatherIcon: '☁️',
        isSevere: false
      },
      daily: {
        targetDate: '2026-06-20',
        tempMax: 25.0,
        precipProbMax: 70
      },
      rawUnits: { temperature: '°C', precipitationProbability: '%' },
      timezone: 'Asia/Tokyo'
    }
  },
  cold: {
    id: 'cold',
    label: '【DEMO】真冬・寒冷 (最高8℃)',
    description: '条件4: 最高気温が10℃未満 (晴れ, 降水確率10%)',
    data: {
      isDemo: true,
      demoScenario: 'cold',
      fetchedAt: new Date().toISOString(),
      city: { id: 'nagoya', name: '名古屋(DEMO)', lat: 35.1815, lon: 136.9066 },
      current: {
        time: '2026-01-20T11:00',
        temperature: 6.0,
        weatherCode: 1, // 晴れ
        weatherLabel: '晴れ',
        weatherIcon: '🌤️',
        isSevere: false
      },
      daily: {
        targetDate: '2026-01-20',
        tempMax: 8.0,
        precipProbMax: 10
      },
      rawUnits: { temperature: '°C', precipitationProbability: '%' },
      timezone: 'Asia/Tokyo'
    }
  },
  outdoor_clear: {
    id: 'outdoor_clear',
    label: '【DEMO】通常・快適 (最高22℃)',
    description: '条件5: それ以外 (晴れ, 降水確率20%) → 屋外10分ウォーキング',
    data: {
      isDemo: true,
      demoScenario: 'outdoor_clear',
      fetchedAt: new Date().toISOString(),
      city: { id: 'tokyo', name: '東京(DEMO)', lat: 35.6895, lon: 139.6917 },
      current: {
        time: '2026-10-15T12:00',
        temperature: 20.0,
        weatherCode: 1, // 晴れ
        weatherLabel: '晴れ',
        weatherIcon: '🌤️',
        isSevere: false
      },
      daily: {
        targetDate: '2026-10-15',
        tempMax: 22.0,
        precipProbMax: 20
      },
      rawUnits: { temperature: '°C', precipitationProbability: '%' },
      timezone: 'Asia/Tokyo'
    }
  }
};
