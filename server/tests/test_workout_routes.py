from .conftest import SAMPLE_PAYLOAD


async def test_create_session_persists_and_returns_id(client):
    res = await client.post("/api/workout/session", json=SAMPLE_PAYLOAD)

    assert res.status_code == 201
    body = res.json()
    assert isinstance(body["id"], str)
    assert "createdAt" in body


async def test_create_session_rejects_malformed_payload(client):
    res = await client.post("/api/workout/session", json={"exerciseId": "squat"})

    assert res.status_code == 422


async def test_get_summary_returns_full_session(client):
    created = await client.post("/api/workout/session", json=SAMPLE_PAYLOAD)
    session_id = created.json()["id"]

    res = await client.get(f"/api/workout/summary/{session_id}")

    assert res.status_code == 200
    body = res.json()
    assert body["id"] == session_id
    assert body["exerciseName"] == "Back Squat"
    assert body["totalReps"] == 8
    assert len(body["reps"]) == 2
    assert body["reps"][1]["flaws"] == ["Knee Valgus"]


async def test_get_summary_returns_404_when_missing(client):
    res = await client.get("/api/workout/summary/does-not-exist")

    assert res.status_code == 404


async def test_session_saved_while_authenticated_is_owned_by_that_user(auth_client):
    created = await auth_client.post("/api/workout/session", json=SAMPLE_PAYLOAD)
    session_id = created.json()["id"]

    owner_view = await auth_client.get(f"/api/workout/summary/{session_id}")
    assert owner_view.status_code == 200

    anonymous = await auth_client.get(
        f"/api/workout/summary/{session_id}", headers={"Authorization": ""}
    )
    assert anonymous.status_code == 404
