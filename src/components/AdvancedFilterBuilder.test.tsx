import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdvancedFilterBuilder, { type FilterGroup } from './AdvancedFilterBuilder';

describe('protected structured search contract', () => {
  it('sends leading-zero components as strings and keeps nested AND context', async () => {
    const user = userEvent.setup();
    const apply = vi.fn();
    const initial: FilterGroup = {
      id: 'root', conjunction: 'AND', conditions: [
        { id: 'ordinal', field: 'inventory.ordinal', operator: 'EQUALS', value: '00935' },
      ], groups: [{ id: 'nested', conjunction: 'AND', conditions: [
        { id: 'museum', field: 'spravce', operator: 'EQUALS', value: 'TEST_MUSEUM' },
        { id: 'series', field: 'inventory.series', operator: 'EQUALS', value: 'ZV' },
      ], groups: [] }],
    };
    function Search() {
      const [group, setGroup] = useState(initial);
      return <AdvancedFilterBuilder filterGroup={group} onChange={setGroup}
        onApply={() => apply(JSON.stringify(group))} onReset={() => {}} />;
    }
    render(<Search />);
    await user.click(screen.getByRole('button', { name: 'Filtrovat výsledky' }));
    const sent = JSON.parse(apply.mock.calls[0][0]);
    expect(sent.conditions[0].value).toBe('00935');
    expect(sent.conjunction).toBe('AND');
    expect(sent.groups[0].conditions.map((c: { field: string }) => c.field)).toEqual(['spravce', 'inventory.series']);
  });

  it('resets an unsupported range when switching to a text component without dropping the value', async () => {
    const user = userEvent.setup(); const change = vi.fn();
    render(<AdvancedFilterBuilder filterGroup={{ id: 'root', conjunction: 'AND', groups: [], conditions: [
      { id: 'ordinal', field: 'inventory.ordinal', operator: 'BETWEEN', value: '00935', valueTo: '01000' },
    ] }} onChange={change} onApply={() => {}} onReset={() => {}} />);
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'inventory.series');
    const condition = change.mock.calls.at(-1)?.[0].conditions[0];
    expect(condition.field).toBe('inventory.series');
    expect(condition.operator).toBe('EQUALS');
    expect(condition.value).toBe('00935');
  });
});
