import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { create } from 'react-test-renderer';

import { StackedBarChart } from './StackedBarChart';

const mock = {
  allEscrowAmount: 100,
  pendingEventCount: 100,
  series: [
    { date: '23/09', dailyEscrowAmounts: 1, dailyPendingEvents: 1 },
    { date: '24/09', dailyEscrowAmounts: 2, dailyPendingEvents: 2 },
    { date: '25/09', dailyEscrowAmounts: 3, dailyPendingEvents: 3 },
  ],
};

describe('when rendered StackedBarChart component', () => {
  it('should render passed prop `allEscrowAmount`', async () => {
    await act(() => {
      render(
        <StackedBarChart
          series={mock.series}
          allEscrowAmount={mock.allEscrowAmount}
          pendingEventCount={mock.pendingEventCount}
        />
      );
    });
    expect(screen.findByLabelText(mock.allEscrowAmount)).toBeTruthy();
  });

  it('should render passed prop `pendingEventCount`', async () => {
    await act(() => {
      render(
        <StackedBarChart
          series={mock.series}
          allEscrowAmount={mock.allEscrowAmount}
          pendingEventCount={mock.pendingEventCount}
        />
      );
    });
    expect(screen.findByLabelText(mock.pendingEventCount)).toBeTruthy();
  });
});

it('CardBarChart component renders correctly, corresponds to the snapshot', () => {
  const tree = create(
    <StackedBarChart
      series={mock.series}
      allEscrowAmount={mock.allEscrowAmount}
      pendingEventCount={mock.pendingEventCount}
    />
  ).toJSON();
  expect(tree).toMatchSnapshot();
});
