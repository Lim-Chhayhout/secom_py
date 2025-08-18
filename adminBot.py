from teleBotpackage.sendText import send_text
from teleBotpackage.sendPhoto import send_photo

def send_order_to_telegram(order):
    token = '7516838493:AAHLcnGZy5ntw6aQ_K1IRVW3NwHGdVS3QvU'
    chat_id = '@su413test'

    products_text = "\n".join([f"{p['name']} (Size: {p['size']}) x{p['quantity']}" for p in order['products']])
    html_txt = f"""<b>🛒 New Order Received</b>
<b>Customer:</b> {order['name']}
<b>Phone:</b> {order['phone']}
<b>Email:</b> {order['email']}
<b>Address:</b> {order['address']}, {order['country']}
<b>Payment:</b> {order['payment_method']}
<b>Subtotal:</b> ${order['subtotal']:.2f}
<b>Delivery Fee:</b> ${order['delivery_fee']:.2f}
<b>Discount:</b> ${order.get('discount_amount', 0):.2f}
<b>Total:</b> ${order['total']:.2f}

<b>Products:</b>
{products_text}
"""

    send_text(token, chat_id, html_txt)

    if order['products']:
        send_photo(token, chat_id, order['products'][0].get('image', ''), html_txt)
