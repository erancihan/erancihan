import java.util.Comparator;
import java.util.PriorityQueue;

public class HuffmanString {
    private <T> T coalesce(T a, T b) {
        if (a != null) {
            return a;
        }

        return b;
    }

    public String encode(String str) {
        // generate char freq
        int[] bag = new int[91];

        // generate frequency
        str.chars().forEach(ch -> bag[ch - 32] += 1);

        // add to queue
        PriorityQueue<QueueNode> q = new PriorityQueue<>(bag.length, Comparator.comparingInt(QueueNode::count));
        for (int i = 0; i < 91; i++) {
            if (bag[i] == 0) {
                continue;
            }
            q.add(new QueueNode("" + ((char) (i + 32)), bag[i]));
        }

        while (!q.isEmpty()) {
            QueueNode l = q.poll();


        }

        return null;
    }

    public String decode(String str) {
        return null;
    }
}

record QueueNode(String key, int count) {
}
