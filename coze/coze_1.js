// 在这里，您可以通过 'params'  获取节点中的输入变量，并通过 'ret' 输出结果
// 'params' 和 'ret' 已经被正确地注入到环境中
// 下面是一个示例，获取节点输入中参数名为'input'的值：
// const input = params.input;
// 下面是一个示例，输出一个包含多种数据类型的 'ret' 对象：
// const ret = { "name": '小明', "hobbies": ["看书", "旅游"] };

async function main({ params }: Args): Promise<Output> {
  const { image_list, audio_list, duration_list, scenes, slogan } = params;

  // 处理音频数据
  const audioData = [];
  let audioStartTime = 0;
  const audioTimelines = [];
  let maxDuration = 0;

  const imageData = [];

  for (let i = 0; i < audio_list.length && i < duration_list.length; i++) {
    const duration = duration_list[i];
    audioData.push({
      audio_url: audio_list[i],
      duration,
      start: audioStartTime,
      end: audioStartTime + duration,
    });
    audioTimelines.push({
      start: audioStartTime,
      end: audioStartTime + duration,
    });
    imageData.push({
      image_url: image_list[i],
      start: audioStartTime,
      end: audioStartTime + duration,
      width: 1440,
      height: 1080,
    });

    audioStartTime += duration;
    maxDuration = audioStartTime;
  }

  const roleImgData = [];
  roleImgData.push({
    image_url: params.role_img_url,
    start: 0,
    end: duration_list[0],
    width: 1440,
    height: 1080,
  });

  const captions = scenes.map((item) => item.cap);
  const subtitleDurations = duration_list;

  const { textTimelines, processedSubtitles } = processSubtitles(
    captions,
    subtitleDurations
  );

  // 封面文字
  const title = params.name;
  const title_list = [];
  title_list.push(title);
  const title_timelines = [
    {
      start: 0,
      end: duration_list[0],
    },
  ];

  // 开场音效
  var kc_audio_url = 'https://cdn.jsdelivr.net/gh/sunxm1999/my-ai-resources@latest/sound/729169__fuzzytuesday__the-coming-hero.wav';
  // 背景音乐
  var bg_audio_url = 'https://cdn.jsdelivr.net/gh/sunxm1999/my-ai-resources@latest/music/Keep-Climbing-The-Soundings.mp3';
  // 结束画面背景图
  const end_bg_img_url = 'https://cdn.jsdelivr.net/gh/sunxm1999/my-ai-resources@latest/image/end_bg.png';

  const end_bg_img_data = [];
  end_bg_img_data.push({
    image_url: end_bg_img_url,
    start: maxDuration,
    end: maxDuration + 4000,
    width: 1440,
    height: 1080,
  });

  const bg_audio_data = [];
  bg_audio_data.push({
    audio_url: bg_audio_url,
    volume: 0.5,
    duration: maxDuration,
    start: 4000,
    end: maxDuration + 4000,
    fade_out_duration: 2000,
  });

  const kc_audio_data = [];
  kc_audio_data.push({
    audio_url: kc_audio_url,
    volume: 0.5,
    duration: 4884897,
    start: 0,
    end: 4884897,
    fade_out_duration: 2000,
  });

  const keyWord = "《识人三国志》";
  const endCaption = `更多三国人物尽在\n${keyWord}系列。`;

  // 构建输出对象
  const ret = {
    audioData: JSON.stringify(audioData),
    bgAudioData: bg_audio_data,
    kcAudioData: kc_audio_data,
    imageData: JSON.stringify(imageData),
    text_timelines: textTimelines,
    text_captions: processedSubtitles,
    title_list: title_list,
    title_timelines: title_timelines,
    roleImgData: JSON.stringify(roleImgData),
    slogan_list: [slogan],
    endCaption: [endCaption],
    endCaptionKeyWord: [keyWord],
    endCaptionTimelines: [
      {
        start: maxDuration,
        end: maxDuration + 4000,
      },
    ],
    endBgImgData: JSON.stringify(end_bg_img_data),
  };

  return ret;
}

const SUB_CONFIG = {
  MAX_LINE_LENGTH: 25,
  SPLIT_PRIORITY: ['。', '!', '?', '.', '，', ':', ';', '：', '；', ' '],
  TIME_PRECISION: 3,
};

function splitLongPhrase(text, maxLen) {
  if (text.length <= maxLen) return [text];

  // 按优先级分隔符切分
  for (const deLimiter of SUB_CONFIG.SPLIT_PRIORITY) {
    const pos = text.lastIndexOf(deLimiter, maxLen - 1); // 关键逻辑：限制查找范围
    if (pos > 0) {
      const splitPos = pos + 1;
      return [
        text.substring(0, splitPos).trim(),
        ...splitLongPhrase(text.substring(splitPos).trim(), maxLen),
      ];
    }
  }

  // 没有分隔符则强制按字符切割
  const startPos = Math.min(maxLen, text.length) - 1;
  for (let i = startPos; i > 0; i--) {
    if (!/\p{Unified_Ideograph}/u.test(text[i])) {
      return [
        text.substring(0, i + 1).trim(),
        ...splitLongPhrase(text.substring(i + 1).trim(), maxLen),
      ];
    }
  }
  // 强制分割时保证不超过maxLen
  const splitPos = Math.min(maxLen, text.length);
  return [
    text.substring(0, splitPos).trim(),
    ...splitLongPhrase(text.substring(splitPos).trim(), maxLen),
  ];
}

const processSubtitles = (captions, subtitleDurations, startTimeus = 0) => {
  const cleanRegex =
    /[\u3000\u3002-\u303F\uff00-\uffef\u2000-\u206f!"#$%&'()*+\-./<=>?@[\]^_`{|}~]/g;

  let processedSubtitles = [];
  let processedSubtitleDurations = [];

  captions.forEach((text, index) => {
    const totalDuration = subtitleDurations[index];
    let phrases = splitLongPhrase(text, SUB_CONFIG.MAX_LINE_LENGTH);

    phrases = phrases
      .map((p) => p.replace(cleanRegex, '').trim())
      .filter((p) => p.length > 0);

    if (phrases.length === 0) {
      processedSubtitles.push('[无内容]');
      processedSubtitleDurations.push(totalDuration);
      return;
    }

    const totalChars = phrases.reduce((sum, p) => sum + p.length, 0);
    let accumulated = 0;

    phrases.forEach((phrase, i) => {
      const ratio = phrase.length / totalChars;
      let duration =
        i === phrases.length - 1
          ? totalDuration - accumulated
          : Math.round(totalDuration * ratio);
      accumulated += duration;
      processedSubtitles.push(phrase);
      processedSubtitleDurations.push(duration);
    });
  });

  // 时间轴生成（从指定起始时间可开始）
  const textTimelines = [];
  let currentTime = startTimeus; // 使用传入的起始时间

  processedSubtitleDurations.forEach((duration) => {
    const start = currentTime;
    const end = start + duration;
    textTimelines.push({ start, end });
    currentTime = end;
  });

  return { textTimelines, processedSubtitles };
};
