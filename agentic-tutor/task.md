# Agentic AI Tutor — Build Tasks

- `[x]` **Phase 1: Foundation**
  - `[x]` Create `requirements.txt`
  - `[x]` Create `state/tutor_state.py` (all Pydantic models)
  - `[x]` Create `utils/llm_fallback.py` (multi-provider LLM fallback)
  - `[x]` Create `tools/mock_tools.py` (5 mock tools)
  - `[x]` Add missing `__init__.py` files

- `[x]` **Phase 2: Agents**
  - `[x]` `agents/roadmap_agent.py`
  - `[x]` `agents/resource_fetcher_agent.py`
  - `[x]` `agents/script_writer_agent.py`
  - `[x]` `agents/assessment_agent.py`
  - `[x]` `agents/doubt_resolver_agent.py`
  - `[x]` `agents/roadmap_adjuster_agent.py`
  - `[x]` `agents/absence_handler_agent.py`
  - `[x]` `agents/performance_tracker_agent.py`

- `[x]` **Phase 3: Flows**
  - `[x]` `flows/course_init_flow.py`
  - `[x]` `flows/lecture_prep_flow.py`
  - `[x]` `flows/doubt_resolution_flow.py`
  - `[x]` `flows/quiz_flow.py`
  - `[x]` `flows/absence_flow.py`
  - `[x]` `flows/performance_flow.py`

- `[x]` **Phase 4: API Layer**
  - `[x]` `routers/tutor_router.py`
  - `[x]` `main.py`

- `[/]` **Phase 5: Verification**
  - `[ ]` Install dependencies
  - `[ ]` Start server and test `/health`
  - `[ ]` Test `/init-course`
