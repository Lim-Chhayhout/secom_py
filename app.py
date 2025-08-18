from flask import Flask, render_template, abort, session, redirect, request, url_for, jsonify
from items import products, discounts
from adminBot import send_order_to_telegram
app = Flask(__name__)
app.secret_key = "test"

product_lists = products
discounts = discounts

application = app

@app.route("/")
def index():
    return render_template("pages/index.html", title="LIM - Kdmv", products=product_lists)

@app.route('/product/<int:product_id>')
def detail(product_id):
    product = next((p for p in product_lists if p['id'] == product_id), None)
    if not product:
        abort(404)
    return render_template('pages/detail.html', product=product)

@app.route("/cart")
def cart():
    cart_items = session.get('cart', [])
    for item in cart_items:
        product = next((p for p in product_lists if p['id'] == item['product_id']), None)
        if product:
            item['title'] = product['title']
            item['category'] = product['category']
            item['price'] = product['price']
            item['image'] = product['image1']
            item['qty_in_stock'] = int(product[item['product_size']])
            if item['product_qty'] > item['qty_in_stock']:
                item['product_qty'] = item['qty_in_stock']
    return render_template("pages/cart.html", title="LIM - Cart", cart_items=cart_items)

@app.route("/add-to-cart", methods=["POST"])
def add_to_cart():
    product_id = int(request.form.get("product_id"))
    product_size = request.form.get("product_size")
    quantity = int(request.form.get("product_qty", 1))

    cart = session.get("cart", [])
    for item in cart:
        if item["product_id"] == product_id and item["product_size"] == product_size:
            item["product_qty"] += quantity
            break
    else:
        cart.append({
            "product_id": product_id,
            "product_size": product_size,
            "product_qty": quantity
        })

    session["cart"] = cart
    return redirect(url_for("cart"))

@app.route("/update-cart-item", methods=["POST"])
def update_cart_item():
    product_id = int(request.form.get("product_id"))
    product_size = request.form.get("product_size")
    quantity = int(request.form.get("quantity"))

    cart = session.get("cart", [])
    for item in cart:
        if item["product_id"] == product_id and item["product_size"] == product_size:
            item["product_qty"] = max(1, quantity)
            break
    session["cart"] = cart
    return {"status": "success"}

@app.route("/cart-count")
def cart_count():
    cart = session.get("cart", [])
    total_count = sum(item['product_qty'] for item in cart)
    return {"count": total_count}


@app.route("/remove-from-cart", methods=["POST"])
def remove_from_cart():
    product_id = int(request.form.get("product_id"))
    product_size = request.form.get("product_size")

    cart = session.get("cart", [])
    cart = [item for item in cart if not (item["product_id"] == product_id and item["product_size"] == product_size)]
    session["cart"] = cart
    return {"status": "success", "cart_count": len(cart)}


@app.route("/checkout", methods=["GET", "POST"])
def checkout():
    cart_items = session.get("cart", [])

    subtotal = 0
    for item in cart_items:
        product = next((p for p in product_lists if p['id'] == item['product_id']), None)
        if product:
            item['title'] = product['title']
            item['category'] = product['category']
            item['price'] = product['price']
            item['image'] = product['image1']
            item['qty_in_stock'] = int(product[item['product_size']])
            if item['product_qty'] > item['qty_in_stock']:
                item['product_qty'] = item['qty_in_stock']
            subtotal += item['price'] * item['product_qty']

    discount_rate = 0
    discount_code = None
    if request.method == "POST":
        discount_code = request.form.get("promo-code")
        if discount_code:
            d = next((d for d in discounts if d["code"] == discount_code), None)
            if d:
                discount_rate = d["percent"]

    discount_amount = subtotal * (discount_rate / 100)
    delivery_fee = 2.00
    total = subtotal - discount_amount + delivery_fee

    return render_template(
        "pages/checkout.html",
        title="LIM - Checkout",
        cart_items=cart_items,
        subtotal=subtotal,
        discount_rate=discount_rate,
        discount_amount=discount_amount,
        delivery_fee=delivery_fee,
        total=total,
        discount_code=discount_code,
    )

@app.route("/success", methods=["POST"])
def success_post():
    # Build order from form
    order = {
        "email": request.form.get("email-cus"),
        "name": request.form.get("name-cus"),
        "phone": request.form.get("phonenumber-cus"),
        "address": request.form.get("address-cus"),
        "country": request.form.get("country-cus"),
        "payment_method": request.form.get("payment_method"),
        "subtotal": float(request.form.get("subtotal")),
        "discount_amount": float(request.form.get("discount_amount")),
        "delivery_fee": float(request.form.get("delivery_fee")),
        "total": float(request.form.get("total")),
        "products": []
    }

    products = []
    for key in request.form:
        if key.startswith("products"):
            import re
            m = re.match(r"products\[(\d+)\]\[(\w+)\]", key)
            if m:
                idx, field = int(m.group(1)), m.group(2)
                while len(products) <= idx:
                    products.append({})
                products[idx][field] = request.form[key]
    order["products"] = products

    # Save order temporarily in session
    session["order_success"] = order

    send_order_to_telegram(order)

    # Clear cart session
    session.pop("cart", None)

    # Redirect to GET endpoint
    return redirect(url_for("success_get"))

@app.route("/success")
def success_get():
    order = session.pop("order_success", None)
    if not order:
        # No order in session → redirect to home page
        return redirect(url_for("index"))

    return render_template("pages/success.html", order=order)



if __name__ == "__main__":
    app.run(debug=True)
