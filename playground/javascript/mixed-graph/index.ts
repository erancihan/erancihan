type GraphNodeId = string;

class GraphNode {
  id: GraphNodeId;
}

class NodeA extends GraphNode {}

class NodeB extends GraphNode {
  connectionA: NodeA;
  connectionB: NodeB;
}

class Graph {
  private nodes: Map<GraphNodeId, GraphNode> = new Map();


}
