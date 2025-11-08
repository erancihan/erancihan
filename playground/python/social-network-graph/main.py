import networkx as nx
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from pyvis.network import Network


# Example: people with preferences as feature vectors
preferences = np.array([
    [1, 0, 1],  # person A
    [0, 1, 1],  # person B
    [1, 1, 1],  # person C
])

sim_matrix = cosine_similarity(preferences)
threshold = 0.7

G = nx.Graph()

# Add nodes
for i in range(len(preferences)):
    G.add_node(i, label=f"Person {i}")

# Add edges based on similarity
for i in range(len(preferences)):
    for j in range(i + 1, len(preferences)):
        sim = sim_matrix[i, j]
        if sim > threshold:
            G.add_edge(i, j, weight=sim)


net = Network(notebook=False)  # set notebook=True if using Jupyter
net.from_nx(G)
net.barnes_hut()  # use Barnes-Hut algorithm for layout 

# Optional: configure
net.show_buttons(filter_=['physics'])  # adds control panel
net.show("graph.html", notebook=False)  # Opens in browser
