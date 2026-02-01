# **Git Workflow Protocol for Agentic Scrum Teams**

This document defines the branching strategy and operational procedures for a **Claude Orchestrator Agent** managing a **Developer Agent** and a **Tester Agent**.

## **1\. Branching Strategy**

To maintain repository integrity and prevent agent collisions, the following branch hierarchy is mandatory:

| Branch Name | Purpose | Stability |
| :---- | :---- | :---- |
| main | Production-ready code. Only updated at Sprint end. | Stable |
| integration | The active Sprint "source of truth." All features merge here. | Beta |
| task/DEV-\[ID\] | Feature development branches created by the Developer Agent. | Experimental |
| task/FIX-\[ID\] | Bug fix branches created when the Tester Agent finds issues. | Experimental |

## **2\. Agent Roles & Responsibilities**

* **Claude (Orchestrator):** Manages Git state, branch creation, PR management, and handoffs between agents.  
* **Developer Agent:** Pulls code, implements logic, runs local builds, and pushes commits to task branches.  
* **Tester Agent:** Pulls task branches, executes test suites, performs QA, and provides "Pass/Fail" signals.

## **3\. The Sprint Cycle: Step-by-Step Instructions**

### **Phase 1: Initialization & Task Start**

1. **Sync State:** Claude pulls the latest integration branch.  
2. **Branch Creation:** Claude creates a new branch: task/DEV-\[Story-ID\].  
3. **Handoff to Dev:** Claude sends the branch name and the User Story requirements to the **Developer Agent**.

### **Phase 2: Feature Development**

1. **Implementation:** Developer Agent performs work on task/DEV-\[Story-ID\].  
2. **Commit Strategy:** Developer Agent makes atomic commits.  
3. **Push & Notify:** Once the Developer Agent finishes, it pushes the branch to origin and notifies Claude.  
4. **Initial Guardrail:** Claude triggers a linting/build script. If it fails, Claude sends logs back to Dev for correction.

### **Phase 3: Testing & Validation**

1. **Handoff to Test:** Claude notifies the **Tester Agent** that the branch is ready.  
2. **Environment Setup:** Tester Agent pulls task/DEV-\[Story-ID\] into a clean environment.  
3. **Execution:** Tester Agent runs Unit, Integration, and Regression tests.  
4. **Decision Logic:**  
   * **IF FAIL:** Tester Agent creates a report. Claude creates a sub-branch task/FIX-\[Story-ID\] and instructs the Developer Agent to fix the specific errors.  
   * **IF PASS:** Tester Agent signs off on the branch.

### **Phase 4: Integration & Cleanup**

1. **Pull Request:** Claude opens a PR from task/DEV-\[Story-ID\] to integration.  
2. **Merge:** Once PR checks pass, Claude merges the PR using a squash and merge strategy to keep the integration history clean.  
3. **Cleanup:** Claude deletes the remote and local task/DEV-\[Story-ID\] branches.  
4. **Status Update:** Claude marks the story as "Done" on the Scrum board.

## **4\. Error Handling & Conflict Resolution**

* **Merge Conflicts:** If a conflict occurs during the merge to integration, Claude must **pause all agent activity** and request human intervention.  
* **Loop Prevention:** If a story fails testing more than 3 times, Claude must escalate to a human Scrum Master to review the requirements or the agent's logic.  
* **Stale Branches:** Every 24 hours, Claude should rebase active task/ branches onto the latest integration branch to minimize drift.

## **5\. Command Reference for Claude Orchestrator**

\# Start a new story  
git checkout integration  
git pull origin integration  
git checkout \-b task/DEV-123

\# Validate Dev work  
git merge-base integration task/DEV-123

\# Merge after Tester approval  
git checkout integration  
git merge \--squash task/DEV-123  
git commit \-m "feat: complete Story 123 \[Agent-Merge\]"  
git push origin integration  
git branch \-D task/DEV-123  
