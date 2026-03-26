import random

def generate_synthetic_crowd(count=50):
    crowd = []
    for i in range(count):
        # We use random distributions to make it "messy" like a real market
        agent = {
            "id": f"agent_{i:03}",
            "budget": round(random.uniform(200, 2000), 2),
            "urgency": round(random.uniform(0.1, 1.0), 2),
            "risk_tolerance": round(random.uniform(0.0, 1.0), 2)
        }
        crowd.append(agent)
    return crowd

# Simple test to see your crowd
if __name__ == "__main__":
    test_crowd = generate_synthetic_crowd(5)
    for p in test_crowd:
        print(p)