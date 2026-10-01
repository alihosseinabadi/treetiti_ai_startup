import streamlit as st
import pandas as pd
import numpy as np


# ============================================================
# PAGE CONFIG
# ============================================================

st.set_page_config(
    page_title="Chegovara Customer Intelligence",
    page_icon="📊",
    layout="wide"
)


# ============================================================
# TITLE
# ============================================================

st.title("📊 Chegovara Customer Intelligence")
st.caption(
    "Customer acquisition, lifecycle and customer-base analysis"
)


# ============================================================
# LOAD DATA
# ============================================================

FILE_PATH = "Chegovara_data.xlsx"

try:
    df = pd.read_excel(FILE_PATH)
except Exception as e:
    st.error(f"Could not read {FILE_PATH}: {e}")
    st.stop()


# ============================================================
# NORMALIZE COLUMN NAMES
# ============================================================

df.columns = (
    df.columns
    .astype(str)
    .str.strip()
)


# ============================================================
# REQUIRED COLUMNS
# ============================================================

required_columns = [
    "user_id",
    "name",
    "account_type",
    "level",
    "status",
    "created_at"
]

missing_columns = [
    col for col in required_columns
    if col not in df.columns
]

if missing_columns:

    st.error(
        "The following required columns are missing:"
    )

    st.write(missing_columns)

    st.write("Columns found in Excel:")

    st.write(list(df.columns))

    st.stop()


# ============================================================
# CLEAN DATA
# ============================================================

df = df.copy()

df["created_at"] = pd.to_datetime(
    df["created_at"],
    errors="coerce"
)

# Remove invalid dates
df = df.dropna(
    subset=["created_at"]
)


# ============================================================
# DATE FEATURES
# ============================================================

df["year"] = df["created_at"].dt.year

df["month"] = df["created_at"].dt.month

df["year_month"] = (
    df["created_at"]
    .dt.to_period("M")
)

df["hour"] = (
    df["created_at"]
    .dt.hour
)

df["weekday"] = (
    df["created_at"]
    .dt.day_name()
)


# ============================================================
# CUSTOMER AGE
# ============================================================

today = pd.Timestamp.today().normalize()

df["customer_days"] = (
    today - df["created_at"]
).dt.days

# Prevent negative values
df["customer_days"] = df["customer_days"].clip(
    lower=0
)


df["age_group"] = pd.cut(
    df["customer_days"],

    bins=[
        0,
        30,
        90,
        180,
        365,
        730,
        np.inf
    ],

    labels=[
        "0-30 days",
        "31-90 days",
        "91-180 days",
        "181-365 days",
        "1-2 years",
        "2+ years"
    ],

    include_lowest=True
)


# ============================================================
# SIDEBAR FILTERS
# ============================================================

st.sidebar.header("Filters")


# Status filter
status_values = sorted(
    df["status"]
    .dropna()
    .astype(str)
    .unique()
)

selected_status = st.sidebar.multiselect(
    "Customer Status",
    status_values,
    default=status_values
)


# Account type filter
account_values = sorted(
    df["account_type"]
    .dropna()
    .astype(str)
    .unique()
)

selected_account_types = st.sidebar.multiselect(
    "Account Type",
    account_values,
    default=account_values
)


# Year filter
year_values = sorted(
    df["year"]
    .dropna()
    .unique()
)

selected_years = st.sidebar.multiselect(
    "Registration Year",
    year_values,
    default=year_values
)


# ============================================================
# APPLY FILTERS
# ============================================================

filtered_df = df[
    df["status"]
    .astype(str)
    .isin(selected_status)
    &
    df["account_type"]
    .astype(str)
    .isin(selected_account_types)
    &
    df["year"]
    .isin(selected_years)
].copy()


# ============================================================
# OVERVIEW
# ============================================================

st.header("Customer Overview")


total_customers = len(filtered_df)


active_customers = (
    filtered_df["status"]
    .astype(str)
    .str.lower()
    .eq("active")
    .sum()
)


inactive_customers = (
    filtered_df["status"]
    .astype(str)
    .str.lower()
    .eq("inactive")
    .sum()
)


active_rate = (
    active_customers / total_customers * 100
    if total_customers > 0
    else 0
)


# ============================================================
# KPI CARDS
# ============================================================

col1, col2, col3, col4 = st.columns(4)


col1.metric(
    "Total Customers",
    f"{total_customers:,}"
)


col2.metric(
    "Active Customers",
    f"{active_customers:,}"
)


col3.metric(
    "Inactive Customers",
    f"{inactive_customers:,}"
)


col4.metric(
    "Active Rate",
    f"{active_rate:.1f}%"
)


# ============================================================
# CUSTOMER STATUS
# ============================================================

st.divider()

st.header("1. Customer Status")


status_counts = (
    filtered_df["status"]
    .value_counts()
)


col1, col2 = st.columns(2)


with col1:

    st.subheader("Customers by Status")

    st.bar_chart(
        status_counts
    )


with col2:

    st.subheader("Status Distribution")

    status_percentage = (
        filtered_df["status"]
        .value_counts(
            normalize=True
        )
        .mul(100)
        .round(2)
        .rename("Percentage")
    )

    st.dataframe(
        status_percentage,
        use_container_width=True
    )


# ============================================================
# ACCOUNT TYPE
# ============================================================

st.divider()

st.header("2. Account Type")


account_counts = (
    filtered_df["account_type"]
    .value_counts()
)


st.bar_chart(
    account_counts
)


account_percentage = (
    filtered_df["account_type"]
    .value_counts(
        normalize=True
    )
    .mul(100)
    .round(2)
    .rename("Percentage")
)


st.dataframe(
    account_percentage,
    use_container_width=True
)


# ============================================================
# YEARLY ACQUISITION
# ============================================================

st.divider()

st.header("3. Customer Acquisition by Year")


yearly = (
    filtered_df
    .groupby("year")
    .size()
    .sort_index()
)


st.line_chart(
    yearly
)


yearly_table = pd.DataFrame({
    "New Customers": yearly
})


yearly_table["Growth %"] = (
    yearly_table["New Customers"]
    .pct_change()
    .mul(100)
    .round(2)
)


st.dataframe(
    yearly_table,
    use_container_width=True
)


# ============================================================
# MONTHLY ACQUISITION
# ============================================================

st.divider()

st.header("4. Monthly Customer Acquisition")


monthly = (
    filtered_df
    .groupby("year_month")
    .size()
    .sort_index()
)


monthly_data = pd.DataFrame({
    "New Customers": monthly
})


monthly_data[
    "3-Month Moving Average"
] = (
    monthly_data[
        "New Customers"
    ]
    .rolling(3)
    .mean()
)


st.line_chart(
    monthly_data
)


# ============================================================
# TOP ACQUISITION MONTHS
# ============================================================

st.subheader(
    "Top 10 Acquisition Months"
)


top_months = (
    monthly
    .sort_values(
        ascending=False
    )
    .head(10)
    .to_frame("New Customers")
)


st.dataframe(
    top_months,
    use_container_width=True
)


# ============================================================
# ACQUISITION ANOMALIES
# ============================================================

st.divider()

st.header(
    "5. Acquisition Anomalies"
)


monthly_mean = monthly.mean()

monthly_std = monthly.std()


spikes = monthly[
    monthly >
    monthly_mean +
    2 * monthly_std
]


weak_months = monthly[
    monthly <
    monthly_mean -
    2 * monthly_std
]


col1, col2 = st.columns(2)


with col1:

    st.subheader(
        "🚀 Unusually Strong Months"
    )

    if len(spikes) > 0:

        st.dataframe(
            spikes
            .to_frame("New Customers"),
            use_container_width=True
        )

    else:

        st.info(
            "No unusually strong months detected."
        )


with col2:

    st.subheader(
        "⚠️ Unusually Weak Months"
    )

    if len(weak_months) > 0:

        st.dataframe(
            weak_months
            .to_frame("New Customers"),
            use_container_width=True
        )

    else:

        st.info(
            "No unusually weak months detected."
        )


# ============================================================
# SEASONALITY
# ============================================================

st.divider()

st.header(
    "6. Customer Acquisition Seasonality"
)


monthly_average = (
    filtered_df
    .groupby(
        ["year", "month"]
    )
    .size()
    .groupby("month")
    .mean()
)


month_names = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December"
}


seasonality = (
    monthly_average
    .rename(index=month_names)
)


st.bar_chart(
    seasonality
)


# ============================================================
# REGISTRATION HOUR
# ============================================================

st.divider()

st.header(
    "7. Customer Registration Time"
)


hourly = (
    filtered_df
    .groupby("hour")
    .size()
    .sort_index()
)


st.bar_chart(
    hourly
)


# ============================================================
# REGISTRATION WEEKDAY
# ============================================================

st.divider()

st.header(
    "8. Customer Registration by Day"
)


weekday_order = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
]


weekday = (
    filtered_df["weekday"]
    .value_counts()
    .reindex(
        weekday_order,
        fill_value=0
    )
)


st.bar_chart(
    weekday
)


# ============================================================
# CUSTOMER LIFECYCLE
# ============================================================

st.divider()

st.header(
    "9. Customer Lifecycle"
)


age_counts = (
    filtered_df["age_group"]
    .value_counts()
    .sort_index()
)


st.bar_chart(
    age_counts
)


# ============================================================
# STATUS × AGE
# ============================================================

st.divider()

st.header(
    "10. Customer Status by Age"
)


lifecycle = pd.crosstab(
    filtered_df["age_group"],
    filtered_df["status"],
    normalize="index"
).mul(100).round(2)


st.dataframe(
    lifecycle,
    use_container_width=True
)


st.bar_chart(
    lifecycle
)


# ============================================================
# ACTIVE RATE BY AGE
# ============================================================

st.subheader(
    "Active Rate by Customer Age"
)


active_mask = (
    filtered_df["status"]
    .astype(str)
    .str.lower()
    .eq("active")
)


active_rate_by_age = (
    filtered_df
    .assign(
        is_active=active_mask
    )
    .groupby(
        "age_group",
        observed=True
    )["is_active"]
    .mean()
    .mul(100)
    .round(2)
)


st.bar_chart(
    active_rate_by_age
)


# ============================================================
# CUSTOMER AGE STATISTICS
# ============================================================

st.divider()

st.header(
    "11. Customer Age Statistics"
)


age_statistics = (
    filtered_df["customer_days"]
    .describe()
)


st.dataframe(
    age_statistics
    .to_frame("Days"),
    use_container_width=True
)


# ============================================================
# DATA QUALITY
# ============================================================

st.divider()

st.header(
    "12. Data Quality"
)


quality = pd.DataFrame({

    "Metric": [

        "Rows",

        "Columns",

        "Duplicate Rows",

        "Missing User ID",

        "Missing Names",

        "Missing Status",

        "Missing Account Type",

        "Missing Created Date"

    ],

    "Value": [

        len(df),

        len(df.columns),

        df.duplicated().sum(),

        df["user_id"].isna().sum(),

        df["name"].isna().sum(),

        df["status"].isna().sum(),

        df["account_type"].isna().sum(),

        df["created_at"].isna().sum()

    ]

})


st.dataframe(
    quality,
    use_container_width=True,
    hide_index=True
)


# ============================================================
# CUSTOMER DATA
# ============================================================

st.divider()

st.header(
    "13. Customer Database"
)


display_columns = [
    "user_id",
    "name",
    "account_type",
    "level",
    "status",
    "created_at"
]


st.dataframe(
    filtered_df[
        display_columns
    ],
    use_container_width=True,
    height=500
)


# ============================================================
# DOWNLOAD FILTERED DATA
# ============================================================

st.subheader(
    "Export Filtered Customers"
)


csv = filtered_df[
    display_columns
].to_csv(
    index=False
).encode("utf-8-sig")


st.download_button(
    label="⬇️ Download Customer Data",
    data=csv,
    file_name="chegovara_filtered_customers.csv",
    mime="text/csv"
)


# ============================================================
# FOOTER
# ============================================================

st.divider()

st.caption(
    "Chegovara Customer Intelligence • TTT Agency"
)