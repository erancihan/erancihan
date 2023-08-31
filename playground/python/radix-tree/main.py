# Radix Tree
from typing import Union, List


class Edge:
    label: str

    parent: Union['Node', None]
    target: Union['Node', None]

    def __init__(self, label=None, parent=None, target=None):
        self.label = label

        self.parent = parent
        self.target = target

    def __hash__(self):
        return hash(self.label)

    def __repr__(self):
        return f"Edge({self.label}, parent:{hex(id(self.parent))}, target:{self.target})"


class Node:
    edges: List[Edge] = None

    def __init__(self):
        self.edges = []

    def __repr__(self):
        return f"Node({hex(id(self))}, edges:[{','.join([str(item) for item in self.edges])}])"

    def _push(self, edge):
        edge.parent = self
        self.edges.append(edge)

        return edge

    def lookup(self, value: str) -> bool:
        return self.contains(value)

    def contains(self, value: str) -> bool:
        node: Node = self
        size: int = 0

        while (node is not None and size < len(value)):
            edge: Edge = None

            prefix: str = value[size:]
            for _edge in node.edges:
                if prefix.startswith(_edge.label):
                    edge = _edge
                    break

            if edge is not None:
                node = edge.target
                size += len(edge.label)
            else:
                node = None

        return (node is not None) and (size == len(value))

    def add(self, value):
        if len(self.edges) == 0:
            self._push(Edge(label=value, target=Node()))
            return

        # find the edge that has first matching char
        edge: Edge = None
        for _edge in self.edges:
            if _edge.label is None or _edge.label == "":
                continue

            if _edge.label[0] != value[0]:
                continue

            edge = _edge

        # if no edge found
        if edge is None:
            self._push(Edge(label=value, target=Node()))
            return

        # found our edge that we will work on
        # find prefix length

        prefix_length = 0
        for idx, ch in enumerate(edge.label):
            if idx > len(value):
                break
            if ch != value[idx]:
                break

            # otherwise, ch == value:
            prefix_length += 1

        prefix = value[:prefix_length]

        if prefix == value:
            return

        suffix_label = edge.label[prefix_length:]
        suffix_value = value[prefix_length:]

        node: Node = None
        if suffix_label is not None and len(suffix_label) > 0:
            # i am spliting the edge
            node = Node()
            node._push(Edge(label=suffix_label, target=edge.target))

            # update O1's (edge) label and target
            edge.label = prefix
            edge.target = node
        else:
            # i am not splitting the edge
            node = edge.target

        assert node is not None

        if suffix_value is not None and len(suffix_value) > 0:
            node.add(suffix_value)
            return

        raise Exception("Unexpected case occured!")


if __name__ == '__main__':
    root = Node()
    root.add('team')
    root.add('test')
    root.add('te')
    root.add('tester')
    root.add('toast')
    root.add('slow')
    root.add('slowly')
    root.add('toasting')
    root.add('toaster')

    print(root)
    print()
    print(f"team     ?: {root.contains('team')}")
    print(f"test     ?: {root.contains('test')}")
    print(f"teams    ?: {root.contains('teams')}")
    print(f"tester   ?: {root.contains('tester')}")
    print(f"toaster  ?: {root.contains('toaster')}")
    print(f"toasters ?: {root.contains('toasters')}")
    print(f"potatoes ?: {root.contains('potatoes')}")
