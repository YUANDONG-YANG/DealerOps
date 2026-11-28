import React, { useState } from "react";

export default function BugHuntApp() {
  // State for login functionality
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // State for search and cart
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);

  // Sample products
  const products = [
    { id: 1, name: "Laptop" },
    { id: 2, name: "Smartphone" },
    { id: 3, name: "Headphones" },
  ];

  // Login handler
  const handleLogin = () => {
    if (username === "admin" && password === "password") {
      setIsLoggedIn(true);
    } else {
      alert("Error");
    }
  };

  // Search handler
  const handleSearch = () => {
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Add to cart handler
  const handleAddToCart = (product) => {
    const existingProduct = cart.find((item) => item.id === product.id);
    if (existingProduct) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  // Remove from cart handler - intentionally defective for the Bug Hunt.
  // The Remove button works as a UI control, but this handler does not update cart state.
  const handleRemoveFromCart = (product) => {
    const selectedProduct = product;
    // BUG: No setCart(...) call is made, so the selected product is not removed
    // and its quantity is not decreased.
  };

  return (
    <div className="app">
      <h1 className="title">Bug Hunt Adventure App</h1>

      {/* Login Form */}
      {!isLoggedIn ? (
        <section className="card">
          <div className="card-content">
            <h2 className="section-title">Login</h2>
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
            <button onClick={handleLogin}>Login</button>
          </div>
        </section>
      ) : (
        <div>
          <h2 className="section-title">Welcome, {username || "User"}!</h2>
          <div className="sections">
            {/* Search Section */}
            <section className="card">
              <div className="card-content">
                <h3 className="card-title">Search Products</h3>
                <input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input"
                />
                <ul className="list">
                  {handleSearch().map((product) => (
                    <li key={product.id}>{product.name}</li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Product List */}
            <section className="card">
              <div className="card-content">
                <h3 className="card-title">Products</h3>
                <ul className="list">
                  {products.map((product) => (
                    <li key={product.id} className="row">
                      {product.name}
                      <button onClick={() => handleAddToCart(product)}>Add to Cart</button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Cart Section */}
            <section className="card">
              <div className="card-content">
                <h3 className="card-title">Shopping Cart</h3>
                {cart.length === 0 ? (
                  <p>Your cart is empty.</p>
                ) : (
                  <ul className="list">
                    {cart.map((item) => (
                      <li key={item.id} className="row">
                        <span>{item.name} (x{item.quantity})</span>
                        <button onClick={() => handleRemoveFromCart(item)}>Remove</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
