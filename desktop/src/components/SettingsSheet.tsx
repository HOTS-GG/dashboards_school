import { setPrefs, usePrefs, type TextSize, type ThemePref } from "../lib/prefs";
import { currentUser } from "../lib/pb";
import { Icon } from "./Icon";

const THEMES: Array<[ThemePref, string]> = [
  ["system", "자동"],
  ["light", "밝게"],
  ["dark", "어둡게"],
];
const SIZES: Array<[TextSize, string]> = [
  ["small", "작게"],
  ["normal", "보통"],
  ["large", "크게"],
  ["xlarge", "아주 크게"],
];

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="field segmented">
      <legend className="field__label">{label}</legend>
      <div className="segmented__track">
        {options.map(([v, text]) => (
          <label key={v} className="segmented__option">
            <input type="radio" name={label} checked={value === v} onChange={() => onChange(v)} />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SettingsSheet({ onLogout, onClose }: { onLogout: () => void; onClose: () => void }) {
  const p = usePrefs();
  return (
    <div className="sheet" role="dialog" aria-label="설정" onClick={onClose}>
      <div className="sheet__card form" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__header">
          <h2 className="sheet__title">설정</h2>
          <button className="button button--icon" onClick={onClose} aria-label="닫기"><Icon name="close" /></button>
        </header>
        <Segmented label="화면 테마 (자동은 Windows 설정을 따름)" value={p.theme} options={THEMES} onChange={(theme) => setPrefs({ theme })} />
        <Segmented label="글씨 크기" value={p.textSize} options={SIZES} onChange={(textSize) => setPrefs({ textSize })} />
        <label className="field field--inline">
          <input type="checkbox" checked={p.showStrip} onChange={(e) => setPrefs({ showStrip: e.target.checked })} />
          <span>위젯 아래에 오늘 수업 표시</span>
        </label>
        <p className="field__hint">항상 위에 표시 · 위치 잠금 · Windows 시작 시 실행은 작업 표시줄 트레이 아이콘 메뉴에 있습니다.</p>
        <div className="form__actions form__actions--split">
          <span className="field__hint">{currentUser()?.email}</span>
          <button className="button button--quiet" onClick={onLogout}><Icon name="signOut" /> 로그아웃</button>
        </div>
      </div>
    </div>
  );
}
