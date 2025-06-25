// 在这里，您可以通过 'params'  获取节点中的输入变量，并通过 'ret' 输出结果
// 'params' 和 'ret' 已经被正确地注入到环境中
// 下面是一个示例，获取节点输入中参数名为'input'的值：
// const input = params.input; 
// 下面是一个示例，输出一个包含多种数据类型的 'ret' 对象：
// const ret = { "name": '小明', "hobbies": ["看书", "旅游"] };

async function main({ params }) {
    // 获取参数
    const segment_ids = params.segment_ids;
    const times = params.duration_list;
    const seg = params.segment_infos;

    if (segment_ids.length !== times.length) {
        throw new Error('segment_ids与times数组长度不一致');
    }

    const keyframes = [];

    for (let idx = 0; idx < segment_ids.length; idx++) {
        const seg_id = segment_ids[idx];
        if (idx === 0) {
            // 跳过第一张图
            continue;
        }
        // 获取对应音频时长并转换为整数
        const audio_duration = parseInt(parseFloat(times[idx]));

        // 根据索引交错决定缩放方向
        const cycle_idx = idx - 1;
        let start_scale, end_scale;
        if (cycle_idx % 2 === 0) {
            // 偶数索引：1.0 -> 1.5
            start_scale = 1.0;
            end_scale = 1.5;
        } else {
            // 奇数索引：1.5 -> 1.0
            start_scale = 1.5;
            end_scale = 1.0;
        }

        // 起始关键帧（秒位置）
        keyframes.push({
            offset: 0,
            property: 'UNIFORM_SCALE',
            segment_id: seg_id,
            value: start_scale,
            easing: 'linear'
        });
        // 结束关键帧（用步奏音频时长）
        keyframes.push({
            offset: audio_duration,
            property: 'UNIFORM_SCALE',
            segment_id: seg_id,
            value: end_scale,
            easing: 'linear'
        });
    }

    // 总论关键帧（秒位置）
    keyframes.push({
        offset: 0,
        property: 'UNIFORM_SCALE',
        segment_id: seg[0]['id'],
        value: 2,
        easing: 'linear'
    });
    keyframes.push({
        offset: 533333,
        property: 'UNIFORM_SCALE',
        segment_id: seg[0]['id'],
        value: 1.2,
        easing: 'linear'
    });
    // 结束关键帧（同步音频时长）
    keyframes.push({
        offset: seg[0]['end'] - seg[0]['start'],
        property: 'UNIFORM_SCALE',
        segment_id: seg[0]['id'],
        value: 1.0,
        easing: 'linear'
    });

    // 构建输出对象
    const ret = {
        keyFrames: JSON.stringify(keyframes)
    };

    return ret;
}