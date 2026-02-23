import pytest
from urllib.parse import quote
from httpx import AsyncClient, ASGITransport

from src.app import app, activities


@pytest.mark.asyncio
async def test_get_activities():
    # Arrange: nothing to prepare
    # Act
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/activities")

    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


@pytest.mark.asyncio
async def test_signup_and_cleanup():
    # Arrange
    activity = "Chess Club"
    email = "pytest_user_signup@example.com"
    # Ensure clean state
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Act
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(f"/activities/{quote(activity)}/signup", params={"email": email})

    # Assert
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]

    # Cleanup
    activities[activity]["participants"].remove(email)


@pytest.mark.asyncio
async def test_duplicate_signup_returns_400():
    # Arrange
    activity = "Chess Club"
    email = "pytest_user_duplicate@example.com"
    # Ensure clean state
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # First signup succeeds
        first = await ac.post(f"/activities/{quote(activity)}/signup", params={"email": email})
        assert first.status_code == 200

        # Act: duplicate signup
        dup = await ac.post(f"/activities/{quote(activity)}/signup", params={"email": email})

    # Assert
    assert dup.status_code == 400

    # Cleanup
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)


@pytest.mark.asyncio
async def test_unregister():
    # Arrange
    activity = "Chess Club"
    email = "pytest_user_unregister@example.com"
    if email not in activities[activity]["participants"]:
        activities[activity]["participants"].append(email)

    # Act
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(f"/activities/{quote(activity)}/unregister", params={"email": email})

    # Assert
    assert resp.status_code == 200
    assert email not in activities[activity]["participants"]
