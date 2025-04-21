{{
    config(
        materialized='view'
    )
}}

SELECT
  c_custkey as customer_id,
  c_name as name,
  c_address as address,
  c_nationkey as nation_id,
  c_phone as phone,
  c_acctbal as account_balance,
  c_mktsegment as market_segment,
  c_comment as comment,
  c_name || '@example.com' as email  -- schemaに必要なemail列を追加
FROM SNOWFLAKE_SAMPLE_DATA.TPCH_SF1.CUSTOMER
