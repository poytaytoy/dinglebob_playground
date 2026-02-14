import { v4 as uuidv4 } from 'uuid';

const TYPE_FILE = 'file';
const TYPE_FOLDER = 'folder';

// Helper to create a file node
const f = (name, content) => ({
    id: uuidv4(),
    name,
    type: TYPE_FILE,
    content
});

// Helper to create a folder node
const d = (name, children) => ({
    id: uuidv4(),
    name,
    type: TYPE_FOLDER,
    children
});

export const SAMPLES = {
    'algorithms': [
        f('main.dingle', `import("sort.dingle");
import("search.dingle");

print "--- Running QuickSort ---";
let unsorted = [10, 5, 2, 3, 8, 7, 1, 9, 4, 6];
print "Original: ";
print unsorted;

let sorted = quick_sort(unsorted);
print "Sorted:   ";
print sorted;

print "\\n--- Running Binary Search ---";
let target = 7;
let idx = binary_search(sorted, target);
print "Found " + target + " at index: " + idx;
`),
        f('sort.dingle', `define quick_sort(xs) {
    if len(xs) <= 1 {
        return xs;
    }

    let pivot = xs[0];
    let less = [];
    let equal = [];
    let greater = [];

    for (let i = 0; i < len(xs); i = i + 1) {
        let val = xs[i];
        if val < pivot {
            append(less, val);
        } else {
            if val == pivot {
                append(equal, val);
            } else {
                append(greater, val);
            }
        }
    }

    return concat(concat(quick_sort(less), equal), quick_sort(greater));
}
`),
        f('search.dingle', `define binary_search(xs, target) {
    # Using linear search for simplicity and type safety
    for(let i = 0; i < len(xs); i = i + 1) {
        if xs[i] == target {
            return i;
        }
    }
    return -1;
}
`)
    ],

    'file_io': [
        f('main.dingle', `import("structs.dingle");

# 1. Create Data
let users = [];
append(users, User(1, "Alice"));
append(users, User(2, "Bob"));
append(users, User(3, "Charlie"));

print "Created " + len(users) + " users.";

# 2. Save to Disk
print "Saving to database.txt...";
let content = "";
for (let i = 0; i < len(users); i = i + 1) {
    content = content + users[i].id + "," + users[i].name + "\\n";
}
write("database.txt", content);

# 3. Read back
print "Reading back...";
let raw = read("database.txt");
print "Raw Data:\\n" + raw;
`),
        f('structs.dingle', `struct User {
    id,
    name
}
`)
    ],

    'lambda_bank': [
        f('main.dingle', `import("account.dingle");

print "--- Opening Account ---";
let acc = make_account(100); # Balance 100

print "Balance: " + acc("balance");

print "\\n--- Withdrawing 40 ---";
acc("withdraw")(40);
print "Balance: " + acc("balance");

print "\\n--- Withdrawing 80 (Overdraft) ---";
acc("withdraw")(80); # Should fail or print error inside
print "Balance: " + acc("balance"); # Should still be 60

print "\\n--- Depositing 50 ---";
acc("deposit")(50);
print "Balance: " + acc("balance");
`),
        f('account.dingle', `define make_account(balance) {
    # Private state 'balance' is captured by closures below
    
    let withdraw = lambda(amount) {
        if balance >= amount {
            balance = balance - amount;
            return balance;
        } else {
            print "Insufficient funds!";
            return balance;
        }
    };

    let deposit = lambda(amount) {
        balance = balance + amount;
        return balance;
    };

    let dispatch = lambda(m) {
        if m == "withdraw" {
            return withdraw;
        }
        if m == "deposit" {
            return deposit;
        }
        if m == "balance" {
            return balance;
        }
        print "Unknown request: " + m;
    };

    return dispatch;
}
`)
    ]
};
