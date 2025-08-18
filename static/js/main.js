/* +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */
/*                                - lim chhayhout [development] -                            */
/*                                      handle pages js                                  */
/* +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ */

(() => {
    const subProductImages = document.querySelectorAll('.single-product .sub-image');
    const mainProductImage = document.getElementById('main-image');
    const bdOverSubImage = document.querySelectorAll('.single-product .col-1 .sub-display-product-image .col-sub-image');

    if (!subProductImages.length || !bdOverSubImage.length) return;

    mainProductImage.src = subProductImages[0].src;
    bdOverSubImage[0].style.border = '1px solid #000';

    const updateMainImage = index => {
        mainProductImage.src = subProductImages[index].src;
        bdOverSubImage.forEach(img => img.style.border = '1px solid rgba(0,0,0,0.2)');
        bdOverSubImage[index].style.border = '1px solid #000';
    }

    subProductImages.forEach((subImage, i) => {
        ['mouseover', 'touchstart', 'click'].forEach(evt =>
            subImage.addEventListener(evt, () => updateMainImage(i))
        );
    });
})();


(() => {
    const sizeElements = document.querySelectorAll('.product-size .size');
    if (!sizeElements.length) return;

    let selectedSize = null;

    sizeElements.forEach(el => {
        if (!el.classList.contains('disabled')) {
            el.addEventListener('click', () => {
                selectedSize?.classList.remove('selected');
                el.classList.add('selected');
                selectedSize = el;
                document.getElementById('selectedSize').value = el.dataset.size;
            });
        }
    });

    window.validateSizeSelection = () => {
        const selected = document.getElementById('selectedSize').value;
        const errorSelected = document.querySelector('.error_size_select');
        const errorMessage = document.querySelector('.error_size_message');

        if (!selected) {
            if (errorSelected) errorSelected.style.color = 'red';
            if (errorMessage) errorMessage.style.display = 'block';
            sizeElements.forEach(el => !el.classList.contains('disabled') && (el.style.border = '1px solid rgb(169,19,19)'));
            return false;
        }

        if (errorSelected) errorSelected.style.color = '';
        if (errorMessage) errorMessage.style.display = 'none';
        sizeElements.forEach(el => !el.classList.contains('disabled') && (el.style.border = ''));
        return true;
    }
})();


(() => {
    if (!window.location.pathname.includes('/cart')) return;

    const promoTrigger = document.getElementById('trigger-input');
    const promoInput = document.getElementById('promo-code-input');
    promoTrigger?.addEventListener('click', () => {
        promoTrigger.style.display = 'none';
        promoInput.style.display = 'flex';
    });
})();


(() => {
    document.querySelectorAll('.status-stock, h4, .size-chart').forEach(el => {
        if (el && !el.textContent.trim()) {
            el.style.padding = '0';
            el.style.margin = '0';
        }
    });
})();

(() => {
    const cartRowsContainer = document.querySelectorAll(".cart-con");
    const totalCartPriceEl = document.querySelector(".total-cart-price");
    const amountToPayEl = document.getElementById("amount-to-pay");
    const cartCountEl = document.querySelector(".cart-count");
    const finalSubtotalEl = document.getElementById("final-subtotal");

    const updateCartCount = async () => {
        if (!cartCountEl) return;
        try {
            const res = await fetch("/cart-count");
            if (!res.ok) return;
            const data = await res.json();
            cartCountEl.textContent = data.count || 0;
        } catch (err) {
            console.error("Failed to fetch cart count:", err);
        }
    };

    const updateTotals = () => {
        if (!cartRowsContainer.length) {
            if (totalCartPriceEl) totalCartPriceEl.textContent = ``;
            if (amountToPayEl) amountToPayEl.textContent = `$0.00`;
            if (cartCountEl) cartCountEl.textContent = 0;
            if (finalSubtotalEl) finalSubtotalEl.value = "0.00";
            return;
        }

        let total = 0;
        let totalItems = 0;

        cartRowsContainer.forEach(row => {
            const qtyInput = row.querySelector(".quantity-input");
            const priceEl = row.querySelector(".price-per-product");
            const subTotalEl = row.querySelector(".sub-total-price");

            if (!qtyInput || !priceEl || !subTotalEl) return;

            const price = parseFloat(priceEl.value);
            const qty = parseInt(qtyInput.value) || 0;

            subTotalEl.textContent = `$${(qty * price).toFixed(2)}`;
            total += qty * price;
            totalItems += qty;
        });

        if (totalCartPriceEl) totalCartPriceEl.textContent = `$${total.toFixed(2)}`;
        if (amountToPayEl) amountToPayEl.textContent = `$${total.toFixed(2)}`;
        if (finalSubtotalEl) finalSubtotalEl.value = total.toFixed(2);
        if (cartCountEl) cartCountEl.textContent = totalItems;
    };

    const updateSession = (productID, productSize, quantity) => {
        fetch("/update-cart-item", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `product_id=${productID}&product_size=${productSize}&quantity=${quantity}`
        }).then(updateCartCount);
    };

    cartRowsContainer.forEach(row => {
        const qtyInput = row.querySelector(".quantity-input");
        const increaseBtn = row.querySelector(".quantity-increase");
        const decreaseBtn = row.querySelector(".quantity-decrease");
        const qtyInStock = parseInt(row.querySelector(".qty-in-stock")?.value) || 0;
        const productID = row.dataset.productId;
        const productSize = row.dataset.productSize;

        increaseBtn?.addEventListener("click", () => {
            let currentQty = parseInt(qtyInput.value) || 0;
            if (currentQty < qtyInStock) {
                qtyInput.value = currentQty + 1;
                updateTotals();
                updateSession(productID, productSize, qtyInput.value);
            }
        });

        decreaseBtn?.addEventListener("click", () => {
            let currentQty = parseInt(qtyInput.value) || 0;
            if (currentQty > 1) {
                qtyInput.value = currentQty - 1;
                updateTotals();
                updateSession(productID, productSize, qtyInput.value);
            }
        });

        const removeBtn = row.querySelector(".btn-remove");
        removeBtn?.addEventListener("click", () => {
            fetch("/remove-from-cart", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `product_id=${productID}&product_size=${productSize}`
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "success") {
                    row.remove();
                    updateTotals();
                    updateCartCount();
                    if (document.querySelectorAll(".cart-con").length === 0) {
                        window.location.reload();
                    }
                }
            });
        });
    });

    updateTotals();
    updateCartCount();
    window.refreshCartCount = updateCartCount;
})();

(() => {
    const form = document.querySelector("#checkout-form");
    const paymentInput = document.querySelector("#payment-method");
    const paymentOptions = document.querySelectorAll(".option-con-payment");

    paymentOptions.forEach(option => {
        option.addEventListener("click", () => {
            paymentOptions.forEach(o => o.classList.remove("active"));
            option.classList.add("active");
            paymentInput.value = option.dataset.value;
        });
    });

    form.addEventListener("submit", e => {
        const email = document.querySelector("#email-user").value.trim();
        const name = document.querySelector("#name-user").value.trim();
        const phone = document.querySelector("#phonenumber-user").value.trim();
        const address = document.querySelector("#address-user").value.trim();

        if (!email || !name || !phone || !address || !paymentInput.value) {
            e.preventDefault();
            alert("Please fill in all required fields and select a payment method.");
        }
    });
})();

