import { addExpenseAction } from "./src/app/crm/expenses/actions";
const formData = new FormData();
// Fake project
formData.append("projectId", "");
formData.append("reason", "Test Expense");
formData.append("amount", "100");
formData.append("currency", "AUD");
formData.append("expenseDate", new Date().toISOString());

addExpenseAction(formData).then(console.log).catch(console.error);
