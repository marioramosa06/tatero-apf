export const toDateKey = (value) => String(value || "").slice(0, 10);

export const parseDateKey = (dateKey) => {
    const [year, month, day] = String(dateKey).split("-").map(Number);
    return new Date(year, month - 1, day);
};

export const formatDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const getWeekMondayKey = (dateKey) => {
    const date = parseDateKey(dateKey);
    const dayOfWeek = date.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    date.setDate(date.getDate() + diffToMonday);
    return formatDateInputValue(date);
};

export const formatMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split("-").map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric"
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
};

export const formatWeekLabel = (mondayKey) => {
    const start = parseDateKey(mondayKey);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startLabel = start.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short"
    });
    const endLabel = end.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short"
    });
    return `Semaine du ${startLabel} au ${endLabel}`;
};

export const formatInvoiceDate = (dateKey) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return dateKey || "—";
    const formatted = parseDateKey(dateKey).toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const formatNumber = (value) =>
    new Intl.NumberFormat("fr-FR").format(Math.round(Number(value) || 0));

export const getInvoiceAverageCost = (invoice) => {
    const patients = Number(invoice?.nbP) || 0;
    const amount = Number(invoice?.amount) || 0;
    const raw = invoice?.averageCost ?? (patients > 0 ? amount / patients : 0);
    return Math.round(Number(raw) || 0);
};

export const filterInvoices = (invoices, { searchQuery = "", onlyHighAvg = false } = {}) => {
    const query = String(searchQuery).trim().toLowerCase();

    return invoices.filter((invoice) => {
        const avg = getInvoiceAverageCost(invoice);
        if (onlyHighAvg && avg <= 3500) return false;

        if (!query) return true;
        const dateKey = toDateKey(invoice.date);
        const monthLabel = /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
            ? formatMonthLabel(dateKey.slice(0, 7)).toLowerCase()
            : "";
        const formattedDate = formatInvoiceDate(dateKey).toLowerCase();
        const comment = String(invoice.comment || "").toLowerCase();

        return (
            dateKey.includes(query) ||
            monthLabel.includes(query) ||
            formattedDate.includes(query) ||
            comment.includes(query)
        );
    });
};

export const groupInvoicesByMonthAndWeek = (invoices) => {
    const sorted = [...invoices].sort((a, b) => {
        const keyA = toDateKey(a.date);
        const keyB = toDateKey(b.date);
        const dateCmp = keyB.localeCompare(keyA);
        if (dateCmp !== 0) return dateCmp;

        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
        return timeB - timeA;
    });

    const monthMap = new Map();

    sorted.forEach((invoice) => {
        const dateKey = toDateKey(invoice.date);
        const isValidKey = /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
        const monthKey = isValidKey ? dateKey.slice(0, 7) : "0000-00";
        const weekKey = isValidKey ? getWeekMondayKey(dateKey) : "0000-00-00";

        if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, {
                monthKey,
                label: isValidKey ? formatMonthLabel(monthKey) : "Date inconnue",
                weeks: new Map(),
                totalAmount: 0,
                totalPatients: 0,
                count: 0
            });
        }

        const monthGroup = monthMap.get(monthKey);
        const roundedAmount = Math.round(Number(invoice.amount) || 0);
        const patients = Number(invoice.nbP) || 0;
        monthGroup.totalAmount += roundedAmount;
        monthGroup.totalPatients += patients;
        monthGroup.count += 1;

        if (!monthGroup.weeks.has(weekKey)) {
            monthGroup.weeks.set(weekKey, {
                weekKey,
                label: isValidKey ? formatWeekLabel(weekKey) : "Semaine inconnue",
                items: [],
                totalAmount: 0,
                totalPatients: 0
            });
        }

        const weekGroup = monthGroup.weeks.get(weekKey);
        weekGroup.items.push(invoice);
        weekGroup.totalAmount += roundedAmount;
        weekGroup.totalPatients += patients;
    });

    return Array.from(monthMap.values()).map((monthGroup) => ({
        ...monthGroup,
        weeks: Array.from(monthGroup.weeks.values())
    }));
};
