"""Unit tests for authoritative Output Validation and Repair Layer."""
import re
import pytest
from app.models import ContextDeeplinkResponse, Goal, Action, StepGroup, Deeplink, actionCategory
from app.validator import (
    validate_and_repair_response,
    normalize_title,
    normalize_action_description,
    normalize_goal_string,
    GOAL_REGEX,
)


def test_normalize_title_word_count() -> None:
    assert normalize_title("Wi-Fi") == "Wi-Fi Troubleshooting"
    assert normalize_title("Wi-Fi Connection Setup") == "Wi-Fi Connection Setup"
    res = normalize_title("How to fix galaxy phone screen flickering when opening camera app")
    assert 2 <= len(res.split()) <= 3
    # Check word count is strictly between 2 and 3 words
    res = normalize_title("Deep sleep mode battery drain diagnostic guide")
    word_cnt = len(res.split())
    assert 2 <= word_cnt <= 3


def test_normalize_action_description_it_will_prefix_and_count() -> None:
    desc1 = normalize_action_description("Reset all network preferences to default settings", "Reset Network")
    assert desc1.startswith("It will")
    word_cnt1 = len(desc1.split())
    assert 5 <= word_cnt1 <= 7

    desc2 = normalize_action_description("Fix issue", "Simple Fix")
    assert desc2.startswith("It will")
    word_cnt2 = len(desc2.split())
    assert 5 <= word_cnt2 <= 7


def test_normalize_goal_regex_compliance() -> None:
    g1 = normalize_goal_string("Follow these steps to resolve screen issue", "Screen Display")
    assert GOAL_REGEX.match(g1)

    g2 = normalize_goal_string("Follow these steps to perform this Wi-Fi Configuration.", "Wi-Fi Setup")
    assert GOAL_REGEX.match(g2)


def test_validate_and_repair_auto_action_deeplink_fallback() -> None:
    official_uris = {"bixby://settings/wifi"}
    resp = ContextDeeplinkResponse(
        contexts=[
            Goal(
                goal="Follow these steps to resolve network.",
                title="Network Settings",
                actions=[
                    Action(
                        actionName="Reset Wi-Fi",
                        description="Will reset your network preferences.",
                        category=actionCategory.auto,
                        stepGroups=[
                            StepGroup(
                                steps=["Tap Reset Network."],
                                actionableDeeplink=None, # Missing for auto action
                            )
                        ],
                    )
                ],
                score=1.5, # Out of bounds
            )
        ]
    )

    repaired = validate_and_repair_response(resp, official_uris)
    repaired_goal = repaired.contexts[0]

    assert GOAL_REGEX.match(repaired_goal.goal)
    assert 2 <= len(repaired_goal.title.split()) <= 3
    assert 0.0 <= repaired_goal.score <= 1.0

    repaired_act = repaired_goal.actions[0]
    assert repaired_act.description.startswith("It will")
    assert 5 <= len(repaired_act.description.split()) <= 7

    sg = repaired_act.stepGroups[0]
    assert sg.actionableDeeplink is not None
    assert sg.actionableDeeplink.deeplink == "bixby://dummy_positive"
