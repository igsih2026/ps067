from app.metadata.registry import registry

print("Available variables:", registry.list_variables())
print()
print("Temperature metadata:", registry.get_variable_metadata("thetao"))
print()
print("Dataset metadata:", registry.get_dataset_metadata())