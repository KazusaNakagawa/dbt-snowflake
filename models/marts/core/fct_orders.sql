{{
    config(
        materialized='table'
    )
}}

SELECT 
    o.order_id,
    o.customer_id,
    o.order_date,
    o.status,
    p.product_id,
    p.price as unit_price,
    oi.quantity,
    oi.quantity * p.price as total_amount
FROM {{ ref('stg_orders') }} o
JOIN raw.order_items oi ON o.order_id = oi.order_id
JOIN {{ ref('stg_products') }} p ON oi.product_id = p.product_id
