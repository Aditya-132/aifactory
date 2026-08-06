from .conftest import SAMPLE_PAYLOAD

BENCH_PAYLOAD = {
    **SAMPLE_PAYLOAD,
    "exerciseId": "bench",
    "exerciseName": "Bench Press",
    "totalReps": 5,
    "avgFormScore": 79,
    "peakEffort": 88,
    "durationSeconds": 120,
}


async def _seed(client, *payloads):
    ids = []
    for payload in payloads:
        res = await client.post("/api/workout/session", json=payload)
        ids.append(res.json()["id"])
    return ids


async def test_history_lists_only_the_callers_sessions(auth_client):
    await _seed(auth_client, SAMPLE_PAYLOAD, BENCH_PAYLOAD)
    await auth_client.post(
        "/api/workout/session", json=SAMPLE_PAYLOAD, headers={"Authorization": ""}
    )

    res = await auth_client.get("/api/workouts/history")

    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2
    assert {item["exerciseId"] for item in body["items"]} == {"squat", "bench"}


async def test_history_filters_by_exercise(auth_client):
    await _seed(auth_client, SAMPLE_PAYLOAD, BENCH_PAYLOAD)

    res = await auth_client.get("/api/workouts/history", params={"exerciseId": "bench"})

    body = res.json()
    assert body["total"] == 1
    assert body["items"][0]["exerciseName"] == "Bench Press"


async def test_history_paginates(auth_client):
    await _seed(auth_client, SAMPLE_PAYLOAD, BENCH_PAYLOAD, SAMPLE_PAYLOAD)

    res = await auth_client.get("/api/workouts/history", params={"limit": 2, "offset": 2})

    body = res.json()
    assert body["total"] == 3
    assert len(body["items"]) == 1
    assert body["limit"] == 2
    assert body["offset"] == 2


async def test_history_rejects_invalid_pagination(auth_client):
    assert (
        await auth_client.get("/api/workouts/history", params={"limit": 0})
    ).status_code == 422


async def test_history_requires_authentication(client):
    assert (await client.get("/api/workouts/history")).status_code == 401


async def test_history_entry_returns_full_session(auth_client):
    (session_id,) = await _seed(auth_client, SAMPLE_PAYLOAD)

    res = await auth_client.get(f"/api/workouts/history/{session_id}")

    assert res.status_code == 200
    assert len(res.json()["reps"]) == 2


async def test_history_entry_hides_other_peoples_sessions(auth_client, client):
    anonymous = await client.post(
        "/api/workout/session", json=SAMPLE_PAYLOAD, headers={"Authorization": ""}
    )

    res = await auth_client.get(f"/api/workouts/history/{anonymous.json()['id']}")

    assert res.status_code == 404


async def test_telemetry_returns_reps_and_flaw_counts(auth_client):
    (session_id,) = await _seed(auth_client, SAMPLE_PAYLOAD)

    res = await auth_client.get(f"/api/workouts/history/{session_id}/telemetry")

    assert res.status_code == 200
    body = res.json()
    assert body["sessionId"] == session_id
    assert len(body["reps"]) == 2
    assert body["flawCounts"] == {"Knee Valgus": 1}


async def test_telemetry_filters_by_severity(auth_client):
    (session_id,) = await _seed(auth_client, SAMPLE_PAYLOAD)

    res = await auth_client.get(
        f"/api/workouts/history/{session_id}/telemetry", params={"severity": "warn"}
    )

    body = res.json()
    assert len(body["reps"]) == 1
    assert body["reps"][0]["rep"] == 2
    assert body["flawCounts"] == {"Knee Valgus": 1}


async def test_stats_are_empty_for_a_new_account(auth_client):
    res = await auth_client.get("/api/workouts/stats")

    assert res.status_code == 200
    body = res.json()
    assert body["totalSessions"] == 0
    assert body["byExercise"] == []
    assert body["lastSessionAt"] is None


async def test_stats_aggregate_across_sessions(auth_client):
    await _seed(auth_client, SAMPLE_PAYLOAD, BENCH_PAYLOAD, SAMPLE_PAYLOAD)

    res = await auth_client.get("/api/workouts/stats")

    body = res.json()
    assert body["totalSessions"] == 3
    assert body["totalReps"] == 21
    assert body["peakEffort"] == 92
    assert body["topFlaws"] == [["Knee Valgus", 3]]
    assert body["byExercise"][0]["exerciseId"] == "squat"
    assert body["byExercise"][0]["sessions"] == 2
    assert body["lastSessionAt"] is not None
