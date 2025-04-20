{{
    config(
        materialized='table'
    )
}}

WITH lineitem AS (
    SELECT
        l_orderkey as order_id,
        l_partkey as product_id,
        l_quantity as quantity,
        l_extendedprice as extended_price,
        l_discount as discount
    FROM SNOWFLAKE_SAMPLE_DATA.TPCH_SF1.LINEITEM
)

SELECT 
    o.order_id,
    o.customer_id,
    o.order_date,
    o.status,
    p.product_id,
    p.retail_price as unit_price,
    li.quantity,
    li.extended_price as total_amount
FROM {{ ref('stg_orders') }} o
JOIN lineitem li ON o.order_id = li.order_id
JOIN {{ ref('stg_products') }} p ON li.product_id = p.product_id
