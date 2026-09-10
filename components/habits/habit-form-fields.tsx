import { HABIT_ICONS } from "@/lib/habits/icons";
import { SCHEDULE_DAYS, dayKeysFromMask } from "@/lib/habits/schedule";

type Defaults = {
  name?: string;
  iconKey?: string;
  scheduleMask?: number;
  targetPerDay?: number;
};

/**
 * Plain server-rendered form fields — no client JS needed. Checkbox/select
 * defaults come from `defaultValue`/`defaultChecked` so this same markup
 * works for both the "add habit" and "edit habit" forms.
 */
export function HabitFormFields({ defaults }: { defaults?: Defaults }) {
  const selectedDays = new Set(
    defaults?.scheduleMask != null ? dayKeysFromMask(defaults.scheduleMask) : []
  );

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input
          type="text"
          name="name"
          required
          maxLength={60}
          defaultValue={defaults?.name}
          className="rounded-md border border-gray-300 px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Icon
        <select
          name="iconKey"
          defaultValue={defaults?.iconKey ?? HABIT_ICONS[0].key}
          className="rounded-md border border-gray-300 px-3 py-2"
        >
          {HABIT_ICONS.map((icon) => (
            <option key={icon.key} value={icon.key}>
              {icon.emoji} {icon.key}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-1 text-sm">
        <legend>Days</legend>
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_DAYS.map((day) => (
            <label
              key={day.key}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1"
            >
              <input
                type="checkbox"
                name="day"
                value={day.key}
                defaultChecked={selectedDays.has(day.key)}
              />
              {day.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        Times per day
        <input
          type="number"
          name="targetPerDay"
          min={1}
          max={20}
          defaultValue={defaults?.targetPerDay ?? 1}
          className="w-24 rounded-md border border-gray-300 px-3 py-2"
        />
      </label>
    </div>
  );
}
