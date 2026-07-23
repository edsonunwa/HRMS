# Department Head Performance Evaluation Flow

## Backend Changes
- [x] Analyze existing codebase
- [x] Department model already has `head` field (FK to User)
- [x] `DepartmentEmployeesView` already exists for filtering employees by department
- [x] `ReviewSubmitView` already exists with department head scope check & HR notification
- [x] `KPIListCreateView` already filters by department for department heads
- [x] Enhance `ReviewSubmitView` to accept per-KPI appraiser scores and update KPI records
- [x] Add endpoint or method to get detailed KPI data for a review (employee + cycle)

## Frontend Changes
- [x] Enhance `ReviewAppraisalModal` to fetch and display employee KPIs per cycle
- [x] Add per-KPI scoring inputs in the appraisal modal
- [x] Pass KPI scores along with the review submission
- [x] Ensure department head sees only their department employees
- [x] Test and verify the complete flow