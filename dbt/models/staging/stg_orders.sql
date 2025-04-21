{{
    config(
        materialized='view'
    )
}}

SELECT
  o_orderkey as order_id,
  o_custkey as customer_id,
  o_orderstatus as status,
  o_totalprice as total_price,
  o_orderdate as order_date,
  o_orderpriority as priority,
  o_clerk as clerk,
  o_shippriority as ship_priority,
  o_comment as comment
FROM SNOWFLAKE_SAMPLE_DATA.TPCH_SF1.ORDERS
