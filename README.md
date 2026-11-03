# 一脚封神 · One Kick

足球题材的 roguelike 轻策略游戏，跑在 TanStack Start + Cloudflare Workers 上。
访问 `/game` 开始一局杯赛。

比赛自动进行，你只在 5–8 个关键瞬间做一次选择（单刀 / 任意球 / 角球 / 防守反击 / 点球）。
每赢一场从三个特性里选一个，靠特性联动越踢越强，8 场全胜捧杯。

## 结构

```
src/
  routes/
    game.tsx          游戏入口路由（3D 只在浏览器里跑）
  game/               纯 TypeScript 逻辑，不依赖 React / Three.js
    types.ts          全部类型
    rng.ts            确定性随机数
    traits.ts         特性池（28 个，分 6 类 / 3 稀有度）
    teams.ts          4 支起始球队
    opponents.ts      8 个对手与赛程
    modifiers.ts      特性 → 修正值，以及局内动态加成
    moments.ts        场景生成 + 关键瞬间判定
    match.ts          比赛模拟、点球大战、赛后简报
    run.ts            杯赛流程、三选一、奖励
    meta.ts           局外解锁与 localStorage 存档
    audio.ts          Web Audio 合成音效（无音频文件）
    useGame.ts        状态机 hook
    render/renderer.ts Three.js 低多边形球场
  components/         界面层
    MatchScreen.tsx   比赛界面（3D + 俯视战术板 + 选项）
    Pitch3D.tsx       3D 容器
    PitchBoard.tsx    俯视定格局面
    Screens.tsx       标题 / 选队 / 图鉴
    FlowScreens.tsx   三选一 / 赛前 / 结算
    ui.tsx            通用小组件
```

## 开发

```bash
npm install
npm run dev
```

逻辑层全部是纯函数，改规则只需要动 `src/game/` 里的文件。
