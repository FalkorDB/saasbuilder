const options: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

const formatInvoiceDate = (monthOffset: number) => {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1));
  return date.toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
};

export const sampleInvoices = [
  {
    pastDue: "No",
    invoiceStatus: "Paid",
    // 1 Month ago
    invoiceDate: formatInvoiceDate(-1),
    // Current Month
    dueDate: formatInvoiceDate(0),
    amount: "$58.09",
    amountPaid: "$58.09",
    paymentTerm: "Net 30",
  },
  {
    pastDue: "No",
    invoiceStatus: "Paid",
    // 2 Months ago
    invoiceDate: formatInvoiceDate(-2),
    // 1 Month ago
    dueDate: formatInvoiceDate(-1),
    amount: "$82.63",
    amountPaid: "$82.63",
    paymentTerm: "Net 30",
  },
  {
    pastDue: "No",
    invoiceStatus: "Paid",
    // 3 Months ago
    invoiceDate: formatInvoiceDate(-3),
    // 2 Months ago
    dueDate: formatInvoiceDate(-2),
    amount: "$64.24",
    amountPaid: "$64.24",
    paymentTerm: "Net 30",
  },
];
