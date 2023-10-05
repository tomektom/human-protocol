import unittest
from datetime import datetime
from unittest.mock import MagicMock, PropertyMock, patch

from human_protocol_sdk.constants import NETWORKS, ChainId, Status
from human_protocol_sdk.filter import PayoutFilter
from human_protocol_sdk.gql.hmtoken import get_holders_query
from human_protocol_sdk.gql.payout import get_payouts_query
from human_protocol_sdk.gql.statistics import (
    get_event_day_data_query,
    get_escrow_statistics_query,
    get_hmtoken_statistics_query,
)
from human_protocol_sdk.statistics import (
    StatisticsClient,
    StatisticsClientError,
    StatisticsParam,
)
from web3 import Web3
from web3.middleware import construct_sign_and_send_raw_middleware
from web3.providers.rpc import HTTPProvider

MOCK_API_KEY = "mock_api_key"


class StatisticsTestCase(unittest.TestCase):
    def setUp(self):
        self.mock_provider = MagicMock(spec=HTTPProvider)
        self.w3 = Web3(self.mock_provider)

        self.mock_chain_id = ChainId.LOCALHOST.value
        type(self.w3.eth).chain_id = PropertyMock(return_value=self.mock_chain_id)

        self.statistics = StatisticsClient(self.w3, MOCK_API_KEY)

    def test_init_with_valid_inputs(self):
        mock_provider = MagicMock(spec=HTTPProvider)
        w3 = Web3(mock_provider)

        mock_chain_id = ChainId.LOCALHOST.value
        type(w3.eth).chain_id = PropertyMock(return_value=mock_chain_id)

        statistics = StatisticsClient(w3, MOCK_API_KEY)

        self.assertEqual(statistics.w3, w3)
        self.assertEqual(statistics.network, NETWORKS[ChainId(mock_chain_id)])

    def test_init_with_invalid_chain_id(self):
        mock_provider = MagicMock(spec=HTTPProvider)
        w3 = Web3(mock_provider)

        mock_chain_id = 9999
        type(w3.eth).chain_id = PropertyMock(return_value=mock_chain_id)

        with self.assertRaises(StatisticsClientError) as cm:
            StatisticsClient(w3, MOCK_API_KEY)
        self.assertEqual(f"Invalid ChainId: {mock_chain_id}", str(cm.exception))

    def test_init_with_invalid_web3(self):
        mock_provider = MagicMock(spec=HTTPProvider)
        w3 = Web3(mock_provider)

        mock_chain_id = None
        type(w3.eth).chain_id = PropertyMock(return_value=mock_chain_id)

        with self.assertRaises(StatisticsClientError) as cm:
            StatisticsClient(w3, MOCK_API_KEY)
        self.assertEqual(f"Invalid Web3 Instance", str(cm.exception))

    def test_get_task_statistics(self):
        param = StatisticsParam(
            date_from=datetime.fromtimestamp(1683811973),
            date_to=datetime.fromtimestamp(1683812007),
        )
        mock_function = MagicMock()

        with patch.object(
            self.statistics,
            "get_data_from_im_api",
        ) as mock_function:
            mock_function.side_effect = [
                {
                    "2023-09-30": {"served": 784983, "solved": 761730},
                    "2023-10-01": {"served": 772217, "solved": 749837},
                    "2023-10-02": {"served": 877682, "solved": 852250},
                },
            ]

            task_statistics = self.statistics.get_task_statistics(param)

            mock_function.assert_any_call(param)

            self.assertEqual(
                task_statistics,
                {
                    "daily_tasks_data": [
                        {
                            "timestamp": datetime.strptime("2023-09-30", "%Y-%m-%d"),
                            "tasks_total": 784983,
                            "tasks_solved": 761730,
                        },
                        {
                            "timestamp": datetime.strptime("2023-10-01", "%Y-%m-%d"),
                            "tasks_total": 772217,
                            "tasks_solved": 749837,
                        },
                        {
                            "timestamp": datetime.strptime("2023-10-02", "%Y-%m-%d"),
                            "tasks_total": 877682,
                            "tasks_solved": 852250,
                        },
                    ],
                },
            )

    def test_get_escrow_statistics(self):
        param = StatisticsParam(
            date_from=datetime.fromtimestamp(1683811973),
            date_to=datetime.fromtimestamp(1683812007),
        )
        mock_function = MagicMock()

        with patch(
            "human_protocol_sdk.statistics.get_data_from_subgraph"
        ) as mock_function:
            mock_function.side_effect = [
                {
                    "data": {
                        "escrowStatistics": {
                            "totalEscrowCount": "1",
                        },
                    }
                },
                {
                    "data": {
                        "eventDayDatas": [
                            {
                                "timestamp": 1,
                                "dailyEscrowCount": "1",
                                "dailyPendingStatusEventCount": "1",
                                "dailyCancelledStatusEventCount": "1",
                                "dailyPartialStatusEventCount": "1",
                                "dailyPaidStatusEventCount": "1",
                                "dailyCompletedStatusEventCount": "1",
                            },
                        ],
                    }
                },
            ]

            escrow_statistics = self.statistics.get_escrow_statistics(param)

            mock_function.assert_any_call(
                "subgraph_url",
                query=get_escrow_statistics_query,
            )

            mock_function.assert_any_call(
                "subgraph_url",
                query=get_event_day_data_query(param),
                params={
                    "from": 1683811973,
                    "to": 1683812007,
                },
            )

            self.assertEqual(
                escrow_statistics,
                {
                    "total_escrows": 1,
                    "daily_escrows_data": [
                        {
                            "timestamp": datetime.fromtimestamp(1),
                            "escrows_total": 1,
                            "escrows_pending": 1,
                            "escrows_solved": 1,
                            "escrows_paid": 1,
                            "escrows_cancelled": 1,
                        },
                    ],
                },
            )

    def test_get_worker_statistics(self):
        param = StatisticsParam(
            date_from=datetime.fromtimestamp(1683811973),
            date_to=datetime.fromtimestamp(1683812007),
        )
        mock_function = MagicMock()

        mock_function_1 = MagicMock()

        with (
            patch.object(
                self.statistics,
                "get_data_from_im_api",
            ) as mock_function,
            patch(
                "human_protocol_sdk.statistics.get_data_from_subgraph",
            ) as mock_function_1,
        ):
            mock_function.side_effect = [
                {
                    "2023-09-30": {"served": 784983, "solved": 761730},
                    "2023-10-01": {"served": 772217, "solved": 749837},
                    "2023-10-02": {"served": 877682, "solved": 852250},
                },
            ]
            mock_function_1.return_value = {
                "data": {
                    "payouts": [
                        {
                            "timestamp": 1,
                            "recipient": "0x123",
                        },
                    ],
                }
            }

            worker_statistics = self.statistics.get_worker_statistics(param)

            mock_function.assert_any_call(param)

            payout_from = datetime.strptime("2023-09-30", "%Y-%m-%d")
            payout_to = datetime.strptime("2023-10-01", "%Y-%m-%d")

            mock_function_1.assert_any_call(
                "subgraph_url",
                query=get_payouts_query(
                    PayoutFilter(
                        date_from=payout_from,
                        date_to=payout_to,
                    )
                ),
                params={
                    "from": int(payout_from.timestamp()),
                    "to": int(payout_to.timestamp()),
                },
            )

            self.assertEqual(
                worker_statistics,
                {
                    "daily_workers_data": [
                        {
                            "timestamp": datetime.strptime("2023-09-30", "%Y-%m-%d"),
                            "active_workers": 1,
                            "average_jobs_solved": 761730,
                        },
                        {
                            "timestamp": datetime.strptime("2023-10-01", "%Y-%m-%d"),
                            "active_workers": 1,
                            "average_jobs_solved": 749837,
                        },
                        {
                            "timestamp": datetime.strptime("2023-10-02", "%Y-%m-%d"),
                            "active_workers": 1,
                            "average_jobs_solved": 852250,
                        },
                    ],
                },
            )

    def test_get_payment_statistics(self):
        param = StatisticsParam(
            date_from=datetime.fromtimestamp(1683811973),
            date_to=datetime.fromtimestamp(1683812007),
        )
        mock_function = MagicMock()

        with patch(
            "human_protocol_sdk.statistics.get_data_from_subgraph"
        ) as mock_function:
            mock_function.side_effect = [
                {
                    "data": {
                        "eventDayDatas": [
                            {
                                "timestamp": 1,
                                "dailyPayoutCount": "4",
                                "dailyPayoutAmount": "100",
                                "dailyWorkerCount": "4",
                                "dailyBulkPayoutEventCount": "2",
                            },
                        ],
                    }
                },
            ]

            payment_statistics = self.statistics.get_payment_statistics(param)

            mock_function.assert_any_call(
                "subgraph_url",
                query=get_event_day_data_query(param),
                params={
                    "from": 1683811973,
                    "to": 1683812007,
                },
            )

            self.assertEqual(
                payment_statistics,
                {
                    "daily_payments_data": [
                        {
                            "timestamp": datetime.fromtimestamp(1),
                            "total_amount_paid": 100,
                            "total_count": 4,
                            "average_amount_per_job": 50,
                            "average_amount_per_worker": 25,
                        },
                    ],
                },
            )

    def test_get_hmt_statistics(self):
        param = StatisticsParam(
            date_from=datetime.fromtimestamp(1683811973),
            date_to=datetime.fromtimestamp(1683812007),
        )
        mock_function = MagicMock()

        with patch(
            "human_protocol_sdk.statistics.get_data_from_subgraph"
        ) as mock_function:
            mock_function.side_effect = [
                {
                    "data": {
                        "hmtokenStatistics": {
                            "totalValueTransfered": "100",
                            "totalTransferEventCount": "4",
                            "holders": "2",
                        },
                    }
                },
                {
                    "data": {
                        "holders": [
                            {
                                "address": "0x123",
                                "balance": "10",
                            },
                        ],
                    }
                },
                {
                    "data": {
                        "eventDayDatas": [
                            {
                                "timestamp": 1,
                                "dailyHMTTransferCount": "4",
                                "dailyHMTTransferAmount": "100",
                            },
                        ],
                    }
                },
            ]

            hmt_statistics = self.statistics.get_hmt_statistics(param)

            mock_function.assert_any_call(
                "subgraph_url",
                query=get_hmtoken_statistics_query,
            )

            mock_function.assert_any_call(
                "subgraph_url",
                query=get_holders_query,
            )

            mock_function.assert_any_call(
                "subgraph_url",
                query=get_event_day_data_query(param),
                params={
                    "from": 1683811973,
                    "to": 1683812007,
                },
            )

            self.assertEqual(
                hmt_statistics,
                {
                    "total_transfer_amount": 100,
                    "total_transfer_count": 4,
                    "total_holders": 2,
                    "holders": [
                        {
                            "address": "0x123",
                            "balance": 10,
                        },
                    ],
                    "daily_hmt_data": [
                        {
                            "timestamp": datetime.fromtimestamp(1),
                            "total_transaction_amount": 100,
                            "total_transaction_count": 4,
                        },
                    ],
                },
            )


if __name__ == "__main__":
    unittest.main(exit=True)
