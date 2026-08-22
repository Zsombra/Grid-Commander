'use client';

import { useState } from 'react';
import type { PositionManagementPreset } from '@/domain/agent/catalog.js';
import type { ValidationIssue } from '@/domain/agent/trading-config.js';
import { CONTROL, CHECKBOX } from './control.js';
import { Field } from './field.js';

export function PositionManagementFieldset({
  presets,
  issues = [],
  initialPreset = 'CUSTOM',
  initialConfig = {},
}: {
  presets: readonly PositionManagementPreset[];
  issues?: readonly ValidationIssue[];
  initialPreset?: string;
  initialConfig?: Record<string, unknown>;
}) {
  const [selectedPreset, setSelectedPreset] = useState(initialPreset);
  
  // The 14 fields state
  const [config, setConfig] = useState({
    enabled: initialConfig.enabled ?? false,
    breakEvenEnabled: initialConfig.breakEvenEnabled ?? false,
    breakEvenTriggerTpProgressPct: initialConfig.breakEvenTriggerTpProgressPct ?? 50,
    trailingEnabled: initialConfig.trailingEnabled ?? false,
    trailingType: initialConfig.trailingType ?? 'ATR',
    trailingAtrMultiple: initialConfig.trailingAtrMultiple ?? 3,
    trailingFixedPct: initialConfig.trailingFixedPct ?? 1,
    trailingBufferPct: initialConfig.trailingBufferPct ?? 0.25,
    timeDecayEnabled: initialConfig.timeDecayEnabled ?? false,
    timeDecayGracePeriodMinutes: initialConfig.timeDecayGracePeriodMinutes ?? 60,
    timeDecayIntervalMinutes: initialConfig.timeDecayIntervalMinutes ?? 15,
    timeDecayTightenPct: initialConfig.timeDecayTightenPct ?? 5,
    timeDecayMaxTightenPct: initialConfig.timeDecayMaxTightenPct ?? 50,
    timeDecayStaleThresholdTpProgressPct: initialConfig.timeDecayStaleThresholdTpProgressPct ?? 50,
  });

  const issueFor = (name: string) => issues.find((i) => i.field === name)?.reason;

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPreset(val);
    
    if (val !== 'CUSTOM') {
      const presetData = presets.find(p => p.preset === val);
      if (presetData && presetData.config) {
        setConfig(prev => ({ ...prev, ...presetData.config }));
      }
    }
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      finalValue = value === '' ? '' : Number(value);
    }
    
    setConfig(prev => ({ ...prev, [name]: finalValue }));
    setSelectedPreset('CUSTOM');
  };

  return (
    <fieldset className="space-y-4">
      <legend className="font-medium">Position Management</legend>
      <p className="text-sm">
        Select a preset to populate position management behaviors, or customize them yourself.
      </p>

      <Field label="Preset" name="positionManagementPreset" error={issueFor('positionManagement.positionManagementPreset')}>
        <select
          id="positionManagementPreset"
          name="positionManagementPreset"
          className={CONTROL}
          value={selectedPreset}
          onChange={handlePresetChange}
        >
          {presets.map((p) => (
            <option key={p.preset} value={p.preset}>
              {p.label}
            </option>
          ))}
          <option value="CUSTOM">Custom</option>
        </select>
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="enabled"
            className={CHECKBOX}
            checked={config.enabled as boolean}
            onChange={handleFieldChange}
          />
          <span>Position Management Enabled</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="breakEvenEnabled"
            className={CHECKBOX}
            checked={config.breakEvenEnabled as boolean}
            onChange={handleFieldChange}
          />
          <span>Break Even Enabled</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Break Even Trigger TP Progress (%)" name="breakEvenTriggerTpProgressPct" error={issueFor('positionManagement.breakEvenTriggerTpProgressPct')}>
          <input
            type="number"
            name="breakEvenTriggerTpProgressPct"
            className={CONTROL}
            value={config.breakEvenTriggerTpProgressPct as number}
            onChange={handleFieldChange}
            step="any"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="trailingEnabled"
            className={CHECKBOX}
            checked={config.trailingEnabled as boolean}
            onChange={handleFieldChange}
          />
          <span>Trailing Stop Enabled</span>
        </label>

        <Field label="Trailing Type" name="trailingType" error={issueFor('positionManagement.trailingType')}>
          <select name="trailingType" className={CONTROL} value={config.trailingType as string} onChange={handleFieldChange}>
            <option value="ATR">ATR</option>
            <option value="FIXED_PCT">Fixed Percentage</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Trailing ATR Multiple" name="trailingAtrMultiple" error={issueFor('positionManagement.trailingAtrMultiple')}>
          <input type="number" name="trailingAtrMultiple" className={CONTROL} value={config.trailingAtrMultiple as number} onChange={handleFieldChange} step="any" />
        </Field>
        <Field label="Trailing Fixed (%)" name="trailingFixedPct" error={issueFor('positionManagement.trailingFixedPct')}>
          <input type="number" name="trailingFixedPct" className={CONTROL} value={config.trailingFixedPct as number} onChange={handleFieldChange} step="any" />
        </Field>
        <Field label="Trailing Buffer (%)" name="trailingBufferPct" error={issueFor('positionManagement.trailingBufferPct')}>
          <input type="number" name="trailingBufferPct" className={CONTROL} value={config.trailingBufferPct as number} onChange={handleFieldChange} step="any" />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="timeDecayEnabled"
            className={CHECKBOX}
            checked={config.timeDecayEnabled as boolean}
            onChange={handleFieldChange}
          />
          <span>Time Decay Enabled</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Time Decay Grace Period (mins)" name="timeDecayGracePeriodMinutes" error={issueFor('positionManagement.timeDecayGracePeriodMinutes')}>
          <input type="number" name="timeDecayGracePeriodMinutes" className={CONTROL} value={config.timeDecayGracePeriodMinutes as number} onChange={handleFieldChange} step="any" />
        </Field>
        <Field label="Time Decay Interval (mins)" name="timeDecayIntervalMinutes" error={issueFor('positionManagement.timeDecayIntervalMinutes')}>
          <input type="number" name="timeDecayIntervalMinutes" className={CONTROL} value={config.timeDecayIntervalMinutes as number} onChange={handleFieldChange} step="any" />
        </Field>
        <Field label="Time Decay Tighten (%)" name="timeDecayTightenPct" error={issueFor('positionManagement.timeDecayTightenPct')}>
          <input type="number" name="timeDecayTightenPct" className={CONTROL} value={config.timeDecayTightenPct as number} onChange={handleFieldChange} step="any" />
        </Field>
        <Field label="Time Decay Max Tighten (%)" name="timeDecayMaxTightenPct" error={issueFor('positionManagement.timeDecayMaxTightenPct')}>
          <input type="number" name="timeDecayMaxTightenPct" className={CONTROL} value={config.timeDecayMaxTightenPct as number} onChange={handleFieldChange} step="any" />
        </Field>
        <Field label="Time Decay Stale Threshold TP Progress (%)" name="timeDecayStaleThresholdTpProgressPct" error={issueFor('positionManagement.timeDecayStaleThresholdTpProgressPct')}>
          <input type="number" name="timeDecayStaleThresholdTpProgressPct" className={CONTROL} value={config.timeDecayStaleThresholdTpProgressPct as number} onChange={handleFieldChange} step="any" />
        </Field>
      </div>
    </fieldset>
  );
}
