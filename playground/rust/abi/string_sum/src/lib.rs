use pyo3::prelude::*;

#[pyclass]
pub struct Foo {
    collector: String,
}

#[pyclass]
pub struct FooBuilder {
    collector: String,
}

#[pymethods]
impl Foo {
    #[staticmethod]
    pub fn builder() -> FooBuilder {
        FooBuilder::new()
    }
}

#[pymethods]
impl FooBuilder {
    #[new]
    pub fn new() -> FooBuilder {
        FooBuilder {
            collector: String::from("x"),
        }
    }

    pub fn append(mut self, next: String) -> FooBuilder {
        self.collector.push_str(&next);

        self
    }

    pub fn build(self) -> Foo {
        Foo {
            collector: self.collector,
        }
    }
}

/// Formats the sum of two numbers as string.
#[pyfunction]
fn sum_as_string(a: usize, b: usize) -> PyResult<String> {
    Ok((a + b).to_string())
}

/// A Python module implemented in Rust.
#[pymodule]
fn string_sum(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(sum_as_string, m)?)?;
    Ok(())
}
