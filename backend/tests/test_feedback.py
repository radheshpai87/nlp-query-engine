import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.feedback import CreateFeedbackRequest, QueryFeedback
from app.models.user import User
from app.models.workspace import Workspace


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_submit_and_list_feedback(
    client: TestClient,
    test_user: User,
    test_workspace: Workspace,
    user_auth_headers: dict[str, str],
) -> None:
    # 1. Submit "Right" positive feedback
    pos_payload = {
        "query_text": "Show top 5 products by price",
        "is_correct": True,
        "category": "accurate",
        "generated_query": "SELECT * FROM products ORDER BY price DESC LIMIT 5",
        "target_databases": ["postgres"],
    }
    res = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback",
        json=pos_payload,
        headers=user_auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["is_correct"] is True
    assert data["query_text"] == "Show top 5 products by price"
    assert data["category"] == "accurate"
    fb_id = data["id"]

    # 2. Submit "Not Right" negative feedback with correction notes
    neg_payload = {
        "query_text": "Count patients by department",
        "is_correct": False,
        "category": "wrong_table",
        "user_notes": "Expected join between admissions and departments, not just count of admissions",
        "corrected_query": "SELECT d.name, COUNT(a.id) FROM admissions a JOIN departments d ON a.department_id = d.id GROUP BY d.name",
        "target_databases": ["postgres"],
    }
    res_neg = client.post(
        f"/api/v1/workspaces/{test_workspace.id}/feedback",
        json=neg_payload,
        headers=user_auth_headers,
    )
    assert res_neg.status_code == 201
    data_neg = res_neg.json()
    assert data_neg["is_correct"] is False
    assert data_neg["category"] == "wrong_table"
    assert "Expected join" in data_neg["user_notes"]

    # 3. List feedback
    list_res = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback",
        headers=user_auth_headers,
    )
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) >= 2
    assert any(item["id"] == fb_id for item in items)

    # 4. Learning summary
    summary_res = client.get(
        f"/api/v1/workspaces/{test_workspace.id}/feedback/learning-summary",
        headers=user_auth_headers,
    )
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_feedback"] >= 2
    assert summary["positive_count"] >= 1
    assert summary["negative_count"] >= 1
    assert "wrong_table" in summary["common_issues"]
